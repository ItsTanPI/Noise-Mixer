// Layer UI, params editor, custom injection
(() => {
  const NM = window.NM;

  function mkLayer() {
    const layer = {
      id: window.uid++,
      type: 'perlin',
      seed: 0,
      z: 0,
      offsetX: 0,
      offsetY: 0,
      blend: 'avg',
      visible: true,
      collapsed: false,
      params: {}
    };
    NM.ensureLayerParams(layer);
    return layer;
  }

  function buildCard(l, idx) {
    NM.cacheBuiltInDefaults();
    const allTypes = [...NM.NOISE_TYPES, ...Object.keys(NM.customFns)];
    const card = document.createElement('div');
    card.className = 'layer-card';
    card.dataset.lid = l.id;

    const hdr = document.createElement('div');
    hdr.className = 'card-header';
    hdr.innerHTML = `<span class="card-toggle">${l.collapsed ? '▸' : '▾'}</span><span class="drag-handle">⠿</span><span class="card-num">${idx + 1}</span><span class="card-title">Layer ${idx + 1}</span><span class="card-badge" id="badge_${l.id}">${l.type}</span><span class="card-eye${l.visible ? '' : ' hidden-layer'}" id="eye_${l.id}">${l.visible ? '●' : '○'}</span><span class="card-rm">✕</span>`;

    hdr.querySelector('.card-eye').addEventListener('click', e => {
      e.stopPropagation();
      l.visible = !l.visible;
      const eye = hdr.querySelector('.card-eye');
      eye.textContent = l.visible ? '●' : '○';
      if (l.visible) eye.classList.remove('hidden-layer');
      else eye.classList.add('hidden-layer');
      render();
    });

    hdr.querySelector('.card-rm').addEventListener('click', e => {
      e.stopPropagation();
      window.layers = window.layers.filter(x => x.id !== l.id);
      renderLayers();
    });

    const toggle = hdr.querySelector('.card-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        l.collapsed = !l.collapsed;
        card.classList.toggle('collapsed', l.collapsed);
        toggle.textContent = l.collapsed ? '▸' : '▾';
        const bodyEl = card.querySelector('.card-body');
        if (bodyEl) bodyEl.style.display = l.collapsed ? 'none' : '';
      });
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const row2 = document.createElement('div');
    row2.className = 'ctrl2';

    const tSel = document.createElement('select');
    allTypes.forEach(t => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      if (t === l.type) o.selected = true;
      tSel.appendChild(o);
    });
    tSel.addEventListener('change', () => {
      l.type = tSel.value;
      document.getElementById('badge_' + l.id).textContent = l.type;
      l.params = {};
      l.paramsMeta = {};
      NM.ensureLayerParams(l);
      NM.applyDefaultsForType(l);
      renderLayers();
    });

    const bSel = document.createElement('select');
    ['avg', 'add', 'mul', 'max', 'min', 'diff'].forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = b.charAt(0).toUpperCase() + b.slice(1);
      if (b === l.blend) o.selected = true;
      bSel.appendChild(o);
    });
    bSel.addEventListener('change', () => {
      l.blend = bSel.value;
      render();
    });

    row2.appendChild(tSel);
    row2.appendChild(bSel);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Params';
    editBtn.addEventListener('click', () => openParamEditor(l));
    row2.appendChild(editBtn);

    body.appendChild(row2);

    const createDraggableNumberControl = (lbl, getVal, setVal, opts = {}) => {
      const val = getVal();
      const d = document.createElement('div');
      d.className = 'ctrl';
      const minAttr = opts.min !== undefined && opts.min !== null ? ` min="${opts.min}"` : '';
      const maxAttr = opts.max !== undefined && opts.max !== null ? ` max="${opts.max}"` : '';
      const step = opts.step ?? 1;
      const prec = opts.prec ?? 0;
      d.innerHTML = `<label>${lbl}</label><input type="number" class="param-number" value="${val.toFixed(prec)}" step="${step}"${minAttr}${maxAttr} style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;

      const inp = d.querySelector('input');
      let dragStart = 0;
      let isDragging = false;

      const applyVal = (v) => {
        let nv = v;
        if (opts.min !== undefined && opts.min !== null && nv < opts.min) nv = opts.min;
        if (opts.max !== undefined && opts.max !== null && nv > opts.max) nv = opts.max;
        setVal(nv);
        inp.value = nv.toFixed(prec);
        render();
      };

      const commitInputValue = () => {
        const raw = inp.value.trim();
        if (raw === '') return;
        const v = parseFloat(raw);
        applyVal(isNaN(v) ? 0 : v);
      };

      inp.addEventListener('input', () => {
        if (isDragging) return;
      });
      inp.addEventListener('change', commitInputValue);
      inp.addEventListener('blur', commitInputValue);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commitInputValue();
          inp.blur();
        } else if (e.key === 'Escape') {
          inp.value = getVal().toFixed(prec);
          inp.blur();
        }
      });

      inp.addEventListener('wheel', (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const stepVal = step || 1;
        const current = parseFloat(inp.value) || 0;
        applyVal(current + dir * stepVal);
      }, { passive: false });

      inp.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart = e.clientY;
        inp.style.cursor = 'ns-resize';
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging && d.contains(inp) && document.activeElement === inp) {
          const delta = dragStart - e.clientY;
          const scale = opts.dragScale ?? 0.5;
          const current = parseFloat(inp.value) || 0;
          const newVal = current + delta * scale;
          applyVal(newVal);
          dragStart = e.clientY;
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        inp.style.cursor = 'default';
      });

      body.appendChild(d);
    };

    if (!l.fixedMeta || typeof l.fixedMeta !== 'object') l.fixedMeta = {};

    const getFixedMeta = (field, defaults) => {
      const meta = l.fixedMeta[field] || {};
      return {
        type: meta.type || defaults.type,
        min: typeof meta.min === 'number' ? meta.min : defaults.min,
        max: typeof meta.max === 'number' ? meta.max : defaults.max,
        step: typeof meta.step === 'number' ? meta.step : defaults.step,
        options: Array.isArray(meta.options) ? meta.options : defaults.options
      };
    };

    const renderFixedControl = (field, label, getVal, setVal, metaDefaults) => {
      const meta = getFixedMeta(field, metaDefaults);
      const current = getVal();
      const d = document.createElement('div');
      d.className = 'ctrl';

      if (meta.type === 'toggle') {
        d.innerHTML = `<label>${label}</label><input type="checkbox" ${current ? 'checked' : ''}>`;
        const inp = d.querySelector('input');
        inp.addEventListener('change', () => {
          setVal(inp.checked ? 1 : 0);
          render();
        });
        body.appendChild(d);
        return;
      }

      if (meta.type === 'select') {
        const options = Array.isArray(meta.options) && meta.options.length ? meta.options : ['0', '1'];
        const currentStr = String(current);
        d.innerHTML = `<label>${label}</label><select></select>`;
        const sel = d.querySelector('select');
        options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (opt === currentStr) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', () => {
          const v = parseFloat(sel.value);
          setVal(isNaN(v) ? 0 : v);
          render();
        });
        body.appendChild(d);
        return;
      }

      const min = Number.isFinite(meta.min) ? meta.min : undefined;
      const max = Number.isFinite(meta.max) ? meta.max : undefined;
      const step = Number.isFinite(meta.step) ? meta.step : 0.01;
      const prec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 2 : 0;

      if (meta.type === 'range') {
        const rangeMin = min ?? 0;
        const rangeMax = max ?? 1;
        d.innerHTML = `<label>${label}</label><input type="range" min="${rangeMin}" max="${rangeMax}" step="${step}" value="${current}"><input type="number" class="param-number" min="${rangeMin}" max="${rangeMax}" step="${step}" value="${current.toFixed(prec)}" style="width:60px;padding:4px;margin-left:4px">`;
        const range = d.querySelector('input[type=range]');
        const num = d.querySelector('input[type=number]');
        range.addEventListener('input', () => {
          const v = parseFloat(range.value);
          setVal(v);
          num.value = v.toFixed(prec);
          render();
        });
        const commitValue = () => {
          const raw = num.value.trim();
          if (raw === '') return;
          const v = parseFloat(raw);
          const nv = isNaN(v) ? 0 : v;
          setVal(nv);
          range.value = String(nv);
          num.value = nv.toFixed(prec);
          render();
        };
        num.addEventListener('change', commitValue);
        num.addEventListener('blur', commitValue);
        num.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            commitValue();
            num.blur();
          } else if (e.key === 'Escape') {
            num.value = getVal().toFixed(prec);
            num.blur();
          }
        });
        body.appendChild(d);
        return;
      }

      const minAttr = min !== undefined ? ` min="${min}"` : '';
      const maxAttr = max !== undefined ? ` max="${max}"` : '';
      createDraggableNumberControl(label, getVal, setVal, {
        min,
        max,
        step,
        prec,
        dragScale: step >= 1 ? 1 : step * 5
      });
    };

    renderFixedControl('seed', 'seed', () => l.seed, v => l.seed = v, { type: 'number', min: 0, max: 9999, step: 1, options: [] });

    const params = NM.ensureLayerParams(l);

    renderFixedControl('offsetX', 'x', () => l.offsetX, v => l.offsetX = v, { type: 'number', min: null, max: null, step: 0.01, options: [] });
    renderFixedControl('offsetY', 'y', () => l.offsetY, v => l.offsetY = v, { type: 'number', min: null, max: null, step: 0.01, options: [] });
    renderFixedControl('z', 'z', () => l.z, v => l.z = v, { type: 'number', min: null, max: null, step: 0.01, options: [] });

    const paramsMeta = l.paramsMeta || {};

    const getAutoRange = (key, val, meta) => {
      const mn = typeof meta?.min === 'number' ? meta.min : undefined;
      const mx = typeof meta?.max === 'number' ? meta.max : undefined;
      const st = typeof meta?.step === 'number' ? meta.step : undefined;
      if (mn !== undefined || mx !== undefined || st !== undefined) {
        return {
          min: mn ?? 0,
          max: mx ?? 1,
          step: st ?? 0.01
        };
      }

      const k = String(key).toLowerCase();
      if (k.includes('scale')) return { min: 1, max: Math.max(200, (Math.abs(val) || 1) * 4), step: 1 };
      if (k.includes('octave')) return { min: 1, max: 10, step: 1 };
      if (k.includes('falloff')) return { min: 0, max: 1, step: 0.01 };
      if (k.includes('warp')) return { min: 0, max: 2, step: 0.01 };
      if (k.includes('angle')) return { min: 0, max: 180, step: 1 };
      if (k.includes('contrast')) return { min: 0, max: 3, step: 0.01 };
      if (k.includes('threshold')) return { min: 0, max: 1, step: 0.01 };

      if (Number.isInteger(val)) return { min: 0, max: Math.max(10, Math.abs(val) * 4), step: 1 };
      if (val >= 0 && val <= 1) return { min: 0, max: 1, step: 0.01 };

      const span = Math.max(1, Math.abs(val) || 1);
      return { min: val - span, max: val + span, step: 0.01 };
    };

    Object.keys(params).forEach(key => {
      const meta = paramsMeta[key] || { type: typeof params[key] === 'boolean' ? 'toggle' : 'number' };
      const d = document.createElement('div');
      d.className = 'ctrl';

      if (meta.type === 'toggle') {
        d.innerHTML = `<label>${key}</label><input type="checkbox" ${params[key] ? 'checked' : ''}>`;
        const inp = d.querySelector('input');
        inp.addEventListener('change', () => {
          params[key] = inp.checked;
          render();
        });
      } else if (meta.type === 'select') {
        const options = Array.isArray(meta.options) ? meta.options : [];
        const current = params[key] ?? (options[0] ?? '');
        d.innerHTML = `<label>${key}</label><select></select>`;
        const sel = d.querySelector('select');
        options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (opt === current) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', () => {
          params[key] = sel.value;
          render();
        });
      } else if (meta.type === 'range') {
        const currentVal = typeof params[key] === 'number' ? params[key] : 0;
        let { min, max, step } = getAutoRange(key, currentVal, meta);
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
          const auto = getAutoRange(key, currentVal, {});
          min = auto.min;
          max = auto.max;
          step = auto.step;
        }
        const prec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 2 : 0;
        d.innerHTML = `<label>${key}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${currentVal}"><input type="number" class="param-number" min="${min}" max="${max}" step="${step}" value="${currentVal.toFixed(prec)}" style="width:60px;padding:4px;margin-left:4px">`;
        const range = d.querySelector('input[type=range]');
        const num = d.querySelector('input[type=number]');

        range.addEventListener('input', () => {
          const v = parseFloat(range.value);
          params[key] = v;
          num.value = v.toFixed(prec);
          render();
        });

        const commitParamValue = () => {
          const raw = num.value.trim();
          if (raw === '') return;
          const v = parseFloat(raw);
          const nv = isNaN(v) ? 0 : v;
          params[key] = nv;
          range.value = String(nv);
          num.value = nv.toFixed(prec);
          render();
        };

        num.addEventListener('change', commitParamValue);
        num.addEventListener('blur', commitParamValue);
        num.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            commitParamValue();
            num.blur();
          } else if (e.key === 'Escape') {
            num.value = (params[key] ?? 0).toFixed(prec);
            num.blur();
          }
        });
      } else if (meta.type === 'number') {
        const currentVal = typeof params[key] === 'number' ? params[key] : 0;
        const min = Number.isFinite(meta.min) ? meta.min : -Infinity;
        const max = Number.isFinite(meta.max) ? meta.max : Infinity;
        const step = Number.isFinite(meta.step) ? meta.step : 0.01;
        const prec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 2 : 0;
        const minAttr = Number.isFinite(min) ? ` min="${min}"` : '';
        const maxAttr = Number.isFinite(max) ? ` max="${max}"` : '';
        d.innerHTML = `<label>${key}</label><input type="number" class="param-number"${minAttr}${maxAttr} step="${step}" value="${currentVal.toFixed(prec)}" style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;
        const num = d.querySelector('input[type=number]');
        let dragStart = 0;
        let isDragging = false;

        const applyVal = (v) => {
          let nv = v;
          if (Number.isFinite(min) && nv < min) nv = min;
          if (Number.isFinite(max) && nv > max) nv = max;
          params[key] = nv;
          num.value = nv.toFixed(prec);
          render();
        };

        const commitParamValue = () => {
          const raw = num.value.trim();
          if (raw === '') return;
          const v = parseFloat(raw);
          applyVal(isNaN(v) ? 0 : v);
        };

        num.addEventListener('input', () => {
          if (isDragging) return;
        });
        num.addEventListener('change', commitParamValue);
        num.addEventListener('blur', commitParamValue);
        num.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            commitParamValue();
            num.blur();
          } else if (e.key === 'Escape') {
            num.value = (params[key] ?? 0).toFixed(prec);
            num.blur();
          }
        });

        num.addEventListener('wheel', (e) => {
          e.preventDefault();
          const dir = e.deltaY < 0 ? 1 : -1;
          const stepVal = step || 0.01;
          const current = parseFloat(num.value) || 0;
          applyVal(current + dir * stepVal);
        }, { passive: false });

        num.addEventListener('mousedown', (e) => {
          isDragging = true;
          dragStart = e.clientY;
          num.style.cursor = 'ns-resize';
        });

        document.addEventListener('mousemove', (e) => {
          if (isDragging && d.contains(num) && document.activeElement === num) {
            const delta = dragStart - e.clientY;
            const dragScale = step >= 1 ? 0.5 : step * 5;
            const current = parseFloat(num.value) || 0;
            const newVal = current + delta * dragScale;
            applyVal(newVal);
            dragStart = e.clientY;
          }
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
          num.style.cursor = 'default';
        });
      } else {
        d.innerHTML = `<label>${key}</label><input type="number" value="${params[key]}" style="flex:1;padding:5px"><span class="val" style="min-width:0"></span>`;
        const inp = d.querySelector('input');
        inp.addEventListener('input', () => {
          const v = parseFloat(inp.value) || 0;
          params[key] = v;
          render();
        });
      }

      body.appendChild(d);
    });

    card.appendChild(hdr);
    card.appendChild(body);

    if (l.collapsed) {
      body.style.display = 'none';
      card.classList.add('collapsed');
    }

    hdr.addEventListener('dragstart', e => {
      window.dragSrcId = l.id;
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', l.id);
    });

    hdr.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.layer-card.drag-over').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (window.dragSrcId !== l.id) card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));

    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (window.dragSrcId === l.id) return;
      const fi = window.layers.findIndex(x => x.id === window.dragSrcId);
      const ti = window.layers.findIndex(x => x.id === l.id);
      if (fi < 0 || ti < 0) return;
      const [m] = window.layers.splice(fi, 1);
      window.layers.splice(ti, 0, m);
      renderLayers();
    });

    hdr.draggable = true;
    return card;
  }

  function renderLayers() {
    const list = document.getElementById('layers-list');
    list.innerHTML = '';
    window.layers.forEach((l, idx) => list.appendChild(buildCard(l, idx)));
    render();
  }

  function addLayer(l) {
    const layer = l ? NM.normalizeLayer(l) : mkLayer();
    window.layers.push(layer);
    renderLayers();
  }

  function injectCustom() {
    const src = document.getElementById('custom-src').value.trim();
    const msg = document.getElementById('inject-msg');
    msg.textContent = '';
    msg.className = 'msg';

    try {
      const fn = new Function('return (' + src + ')')();
      if (typeof fn !== 'function') throw new Error('Not a function');

      const m = src.match(/function\s+(\w+)/);
      const name = m ? m[1] : 'custom_' + Object.keys(NM.customFns).length;
      NM.customFns[name] = fn;

      const defaults = NM.extractDefaultParamsFromSource(src);
      if (defaults && typeof defaults === 'object') {
        NM.customFnParamDefaults[name] = defaults;
        const meta = {};
        Object.keys(defaults).forEach(k => {
          meta[k] = { type: typeof defaults[k] === 'boolean' ? 'toggle' : 'number' };
        });
        NM.customFnParamMeta[name] = meta;
      }

      const l = mkLayer();
      l.type = name;
      NM.applyDefaultsForType(l);
      addLayer(l);

      msg.textContent = name + ' injected! Signature: (x, y, z, seed, params) — add params via Custom Params';
      msg.className = 'msg ok';
    } catch (e) {
      msg.textContent = 'Error: ' + e.message + ' (check function signature)';
      msg.className = 'msg err';
    }
  }

  // Param Editor Modal
  const paramEditorModal = document.getElementById('param-editor-modal');
  const paramEditorList = document.getElementById('param-editor-list');
  const paramEditorAdd = document.getElementById('param-editor-add');
  const paramEditorSave = document.getElementById('param-editor-save');
  const paramEditorCancel = document.getElementById('param-editor-cancel');
  const paramEditorClose = document.getElementById('param-editor-close');

  function getLayerById(id) {
    return window.layers.find(l => String(l.id) === String(id));
  }

  function renderParamEditor(layer) {
    if (!paramEditorList) return;
    paramEditorList.innerHTML = '';
    NM.ensureLayerParams(layer);

    const addFixedRow = (label, field, value) => {
      if (!layer.fixedMeta || typeof layer.fixedMeta !== 'object') layer.fixedMeta = {};
      const meta = layer.fixedMeta[field] || { type: 'number', step: 0.01 };
      const row = document.createElement('div');
      row.className = 'param-row';
      row.dataset.fixedField = field;

      row.innerHTML = `
        <div>
          <div class="param-label">Name</div>
          <input class="param-name" value="${label}" disabled>
        </div>
        <div>
          <div class="param-label">Type</div>
          <select class="param-type">
            <option value="number">number</option>
            <option value="range">range</option>
            <option value="toggle">toggle</option>
            <option value="select">select</option>
          </select>
        </div>
        <div>
          <div class="param-label">Default</div>
          <input class="param-default" value="${value}">
        </div>
        <div>
          <div class="param-label">Min</div>
          <input class="param-min">
        </div>
        <div>
          <div class="param-label">Max</div>
          <input class="param-max">
        </div>
        <div>
          <div class="param-label">Step</div>
          <input class="param-step">
        </div>
        <div>
          <div class="param-label">Options (comma)</div>
          <input class="param-options">
        </div>
        <button class="param-remove" title="Remove" style="display:none">×</button>
      `;

      const typeSel = row.querySelector('.param-type');
      const minInp = row.querySelector('.param-min');
      const maxInp = row.querySelector('.param-max');
      const stepInp = row.querySelector('.param-step');
      const optInp = row.querySelector('.param-options');

      typeSel.value = meta.type || 'number';
      minInp.value = meta.min ?? '';
      maxInp.value = meta.max ?? '';
      stepInp.value = meta.step ?? '';
      optInp.value = Array.isArray(meta.options) ? meta.options.join(', ') : '';

      const refreshVisibility = () => {
        const t = typeSel.value;
        const showRange = t === 'range' || t === 'number';
        minInp.parentElement.style.display = showRange ? '' : 'none';
        maxInp.parentElement.style.display = showRange ? '' : 'none';
        stepInp.parentElement.style.display = showRange ? '' : 'none';
        optInp.parentElement.style.display = t === 'select' ? '' : 'none';
        if ((t === 'range' || t === 'number') && !stepInp.value) stepInp.value = '0.01';
      };
      refreshVisibility();
      typeSel.addEventListener('change', refreshVisibility);

      paramEditorList.appendChild(row);
    };

    addFixedRow('x', 'offsetX', layer.offsetX ?? 0);
    addFixedRow('y', 'offsetY', layer.offsetY ?? 0);
    addFixedRow('z', 'z', layer.z ?? 0);
    addFixedRow('seed', 'seed', layer.seed ?? 0);

    const keys = Object.keys(layer.params);
    if (!keys.length) {
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'No params yet. Click “+ Add Param” to create one.';
      paramEditorList.appendChild(empty);
    }

    keys.forEach(key => {
      const meta = layer.paramsMeta?.[key] || { type: typeof layer.params[key] === 'boolean' ? 'toggle' : 'number' };
      const row = document.createElement('div');
      row.className = 'param-row';

      row.innerHTML = `
        <div>
          <div class="param-label">Name</div>
          <input class="param-name" value="${key}">
        </div>
        <div>
          <div class="param-label">Type</div>
          <select class="param-type">
            <option value="number">number</option>
            <option value="range">range</option>
            <option value="toggle">toggle</option>
            <option value="select">select</option>
          </select>
        </div>
        <div>
          <div class="param-label">Default</div>
          <input class="param-default">
        </div>
        <div>
          <div class="param-label">Min</div>
          <input class="param-min">
        </div>
        <div>
          <div class="param-label">Max</div>
          <input class="param-max">
        </div>
        <div>
          <div class="param-label">Step</div>
          <input class="param-step">
        </div>
        <div>
          <div class="param-label">Options (comma)</div>
          <input class="param-options">
        </div>
        <button class="param-remove" title="Remove">×</button>
      `;

      const typeSel = row.querySelector('.param-type');
      const defInp = row.querySelector('.param-default');
      const minInp = row.querySelector('.param-min');
      const maxInp = row.querySelector('.param-max');
      const stepInp = row.querySelector('.param-step');
      const optInp = row.querySelector('.param-options');
      const removeBtn = row.querySelector('.param-remove');

      typeSel.value = meta.type || 'number';
      defInp.value = layer.params[key];
      minInp.value = meta.min ?? '';
      maxInp.value = meta.max ?? '';
      stepInp.value = meta.step ?? '';
      optInp.value = Array.isArray(meta.options) ? meta.options.join(', ') : '';

      const refreshVisibility = () => {
        const t = typeSel.value;
        const showRange = t === 'range' || t === 'number';
        minInp.parentElement.style.display = showRange ? '' : 'none';
        maxInp.parentElement.style.display = showRange ? '' : 'none';
        stepInp.parentElement.style.display = showRange ? '' : 'none';
        optInp.parentElement.style.display = t === 'select' ? '' : 'none';
        if (t === 'toggle') {
          defInp.value = defInp.value === 'true' || defInp.value === 'false' ? defInp.value : 'false';
        }
        if ((t === 'range' || t === 'number') && !stepInp.value) {
          stepInp.value = '0.01';
        }
      };
      refreshVisibility();
      typeSel.addEventListener('change', refreshVisibility);

      removeBtn.addEventListener('click', () => row.remove());

      paramEditorList.appendChild(row);
    });
  }

  function openParamEditor(layer) {
    if (!paramEditorModal) return;
    paramEditorModal.dataset.lid = layer.id;
    renderParamEditor(layer);
    paramEditorModal.classList.remove('hidden');
  }

  if (paramEditorAdd) {
    paramEditorAdd.addEventListener('click', () => {
      if (!paramEditorList) return;
      const row = document.createElement('div');
      row.className = 'param-row';
      row.innerHTML = `
        <div>
          <div class="param-label">Name</div>
          <input class="param-name" value="param">
        </div>
        <div>
          <div class="param-label">Type</div>
          <select class="param-type">
            <option value="number">number</option>
            <option value="range">range</option>
            <option value="toggle">toggle</option>
            <option value="select">select</option>
          </select>
        </div>
        <div>
          <div class="param-label">Default</div>
          <input class="param-default" value="0">
        </div>
        <div>
          <div class="param-label">Min</div>
          <input class="param-min" value="0">
        </div>
        <div>
          <div class="param-label">Max</div>
          <input class="param-max" value="1">
        </div>
        <div>
          <div class="param-label">Step</div>
          <input class="param-step" value="0.01">
        </div>
        <div>
          <div class="param-label">Options (comma)</div>
          <input class="param-options" value="">
        </div>
        <button class="param-remove" title="Remove">×</button>
      `;
      row.querySelector('.param-remove').addEventListener('click', () => row.remove());
      paramEditorList.appendChild(row);
    });
  }

  function closeParamEditor() {
    if (paramEditorModal) paramEditorModal.classList.add('hidden');
  }

  if (paramEditorCancel) paramEditorCancel.addEventListener('click', closeParamEditor);
  if (paramEditorClose) paramEditorClose.addEventListener('click', closeParamEditor);
  if (paramEditorModal) {
    paramEditorModal.addEventListener('click', (e) => {
      if (e.target === paramEditorModal) closeParamEditor();
    });
  }

  if (paramEditorSave) {
    paramEditorSave.addEventListener('click', () => {
      const lid = paramEditorModal?.dataset?.lid;
      const layer = getLayerById(lid);
      if (!layer || !paramEditorList) return;

      const rows = Array.from(paramEditorList.querySelectorAll('.param-row'));
      const newParams = {};
      const newMeta = {};

      if (!layer.fixedMeta || typeof layer.fixedMeta !== 'object') layer.fixedMeta = {};

      rows.forEach(row => {
        const fixedField = row.dataset.fixedField;
        if (fixedField) {
          const type = row.querySelector('.param-type')?.value || 'number';
          const defValRaw = row.querySelector('.param-default')?.value;
          const minRaw = row.querySelector('.param-min')?.value;
          const maxRaw = row.querySelector('.param-max')?.value;
          const stepRaw = row.querySelector('.param-step')?.value;
          const optRaw = row.querySelector('.param-options')?.value;

          let val = defValRaw;
          if (type === 'toggle') {
            val = defValRaw === 'true' || defValRaw === true ? 1 : 0;
          } else {
            const v = parseFloat(defValRaw);
            val = isNaN(v) ? 0 : v;
          }

          if (fixedField === 'seed') layer.seed = Math.round(val);
          else if (fixedField === 'offsetX') layer.offsetX = val;
          else if (fixedField === 'offsetY') layer.offsetY = val;
          else if (fixedField === 'z') layer.z = val;

          const minVal = parseFloat(minRaw);
          const maxVal = parseFloat(maxRaw);
          const stepVal = parseFloat(stepRaw);
          const meta = { type };
          if (!isNaN(minVal)) meta.min = minVal;
          if (!isNaN(maxVal)) meta.max = maxVal;
          meta.step = !isNaN(stepVal) ? stepVal : 0.01;
          if (type === 'select') {
            meta.options = (optRaw || '').split(',').map(s => s.trim()).filter(Boolean);
          }
          layer.fixedMeta[fixedField] = meta;
          return;
        }

        const name = row.querySelector('.param-name')?.value?.trim();
        if (!name) return;
        const type = row.querySelector('.param-type')?.value || 'number';
        const defValRaw = row.querySelector('.param-default')?.value;
        const minRaw = row.querySelector('.param-min')?.value;
        const maxRaw = row.querySelector('.param-max')?.value;
        const stepRaw = row.querySelector('.param-step')?.value;
        const optRaw = row.querySelector('.param-options')?.value;

        let defVal = defValRaw;
        if (type === 'toggle') {
          defVal = defValRaw === 'true' || defValRaw === true;
        } else if (type === 'number' || type === 'range') {
          const n = parseFloat(defValRaw);
          defVal = isNaN(n) ? 0 : n;
        }

        newParams[name] = defVal;
        const meta = { type };
        if (type === 'range' || type === 'number') {
          const minVal = parseFloat(minRaw);
          const maxVal = parseFloat(maxRaw);
          const stepVal = parseFloat(stepRaw);
          if (!isNaN(minVal)) meta.min = minVal;
          if (!isNaN(maxVal)) meta.max = maxVal;
          meta.step = !isNaN(stepVal) ? stepVal : 0.01;
        }
        if (type === 'select') {
          const opts = (optRaw || '').split(',').map(s => s.trim()).filter(Boolean);
          meta.options = opts;
          if (!opts.includes(String(defVal))) {
            const fallback = opts[0] || '';
            newParams[name] = fallback;
          }
        }
        newMeta[name] = meta;
      });

      layer.params = newParams;
      layer.paramsMeta = newMeta;
      renderLayers();
      closeParamEditor();
    });
  }

  // Export on window for existing code
  window.mkLayer = mkLayer;
  window.buildCard = buildCard;
  window.renderLayers = renderLayers;
  window.addLayer = addLayer;
  window.injectCustom = injectCustom;
  window.openParamEditor = openParamEditor;
})();

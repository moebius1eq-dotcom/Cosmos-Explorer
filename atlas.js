(() => {
  const list = document.querySelector('.object-list');
  const visual = document.querySelector('.object-visual');
  const img = visual.querySelector('img');
  const canvas = visual.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const dialog = document.querySelector('dialog');
  let objects = [], current = 0;
  const atlasControls = [visual, ...document.querySelectorAll('.object-controls button')];
  atlasControls.forEach(button => button.disabled = true);
  document.querySelector('.observation').setAttribute('aria-busy','true');
  function facts(target, data) {
    target.replaceChildren(...Object.entries(data).map(([label, value]) => {
      const row = document.createElement('div'), term = document.createElement('dt'), detail = document.createElement('dd');
      term.textContent = label; detail.textContent = value; row.append(term, detail); return row;
    }));
  }
  function illustration(object) {
    ctx.clearRect(0, 0, 1000, 800);
    if (object.id === 'sun') {
      const glow = ctx.createRadialGradient(430, 340, 10, 500, 400, 310);
      glow.addColorStop(0, '#fff4c0'); glow.addColorStop(.75, '#e4a450'); glow.addColorStop(.82, '#b96921'); glow.addColorStop(1, '#030405');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 1000, 800); return;
    }
    // Deterministic schematic: these are scale illustrations, not telescope images.
    for (let i = 0; i < 6000; i++) {
      const n = Math.sin(i * 127.1) * 43758.5453, f = n - Math.floor(n);
      const angle = i * 2.39996, radius = Math.sqrt(f) * 340;
      let x, y;
      if (object.id === 'milky-way' || object.id === 'andromeda') {
        const spiral = radius * .021 + (i % 4) * Math.PI / 2 + Math.sin(i * 3.7) * .32;
        x = 500 + Math.cos(spiral) * radius; y = 400 + Math.sin(spiral) * radius * .46;
      } else {
        x = 500 + Math.cos(angle) * radius; y = 400 + Math.sin(angle) * radius;
        if (object.id === 'cosmic-web') { x += Math.sin(y * .035) * 55; y += Math.sin(x * .024) * 40; }
      }
      ctx.fillStyle = `rgba(204,218,230,${.12 + (1 - f) * .55})`; ctx.fillRect(x, y, 1.3, 1.3);
    }
  }
  function select(id) {
    current = Math.max(0, objects.findIndex(o => o.id === id));
    const object = objects[current];
    document.title = `${object.name} — Cosmos Explorer`;
    document.querySelector('#object-name').textContent = object.name;
    document.querySelector('.object-kind').textContent = object.kind;
    document.querySelector('.object-description').textContent = object.description;
    facts(document.querySelector('.object-facts'), object.facts);
    const source = document.querySelector('.object-source'); source.href = object.source;
    let physical = document.querySelector('.physical-source');
    if (!physical) { physical = document.createElement('a'); physical.className = 'object-source physical-source'; physical.textContent = 'Physical data: NASA/JPL ↗'; physical.target = '_blank'; physical.rel = 'noopener'; source.after(physical); }
    physical.hidden = !object.physicalSource;
    if (object.physicalSource) physical.href = object.physicalSource;
    const url = object.image || (['earth','moon'].includes(object.id) ? `assets/atlas-${object.id}.png` : null);
    img.hidden = !url; canvas.hidden = !!url;
    if (url) { img.src = url; img.alt = `${object.name} — NASA imagery`; }
    else illustration(object);
    visual.setAttribute('aria-label', `Inspect ${object.name} facts`);
    document.querySelector('.object-credit').textContent = url ? 'Imagery: NASA and mission partners. Color processing and views vary by mission; images are not to a common scale.' : 'Schematic illustration · not to scale';
    list.querySelectorAll('a').forEach(a => { if(a.hash === '#' + object.id) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); });
  }
  img.addEventListener('error', () => { img.hidden = true; canvas.hidden = false; ctx.clearRect(0,0,1000,800); ctx.fillStyle='#a6abaa'; ctx.font='24px sans-serif'; ctx.textAlign='center'; ctx.fillText('Image unavailable — facts remain available',500,400); });
  visual.addEventListener('click', () => {
    const object = objects[current]; if(!object) return; dialog.querySelector('h2').textContent = object.name;
    dialog.querySelector('p').textContent = object.description;
    facts(dialog.querySelector('dl'), object.facts); dialog.showModal();
  });
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => visual.focus());
  document.querySelector('.previous-object').addEventListener('click', () => location.hash = objects[(current + objects.length - 1) % objects.length].id);
  document.querySelector('.next-object').addEventListener('click', () => location.hash = objects[(current + 1) % objects.length].id);
  window.addEventListener('hashchange', () => { if(objects.length) select(location.hash.slice(1)); });
  fetch('objects.json').then(r => { if(!r.ok) throw Error('Atlas unavailable'); return r.json(); }).then(data => {
    objects = data.filter(o => document.body.dataset.category === 'deep' ? ['milky-way','andromeda','cosmic-web','universe'].includes(o.id) : !['milky-way','andromeda','cosmic-web','universe'].includes(o.id));
    list.replaceChildren(...objects.map(object => { const a = document.createElement('a'); a.href = '#' + object.id; a.textContent = object.name; return a; }));
    select(location.hash.slice(1));
    atlasControls.forEach(button => button.disabled = false);
    document.querySelector('.observation').setAttribute('aria-busy','false');
  }).catch(() => { document.querySelector('.observation').setAttribute('aria-busy','false'); document.querySelector('.atlas-intro').textContent = 'The atlas could not load. Please refresh the page using a local web server.'; });
})();

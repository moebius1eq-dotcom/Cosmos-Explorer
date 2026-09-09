(() => {
  const header = document.querySelector('.site-header');
  header.querySelector('.primary-nav')?.remove();
  header.querySelector('.atlas-header-note')?.remove();
  const oldIndex = header.querySelector('.menu-button');
  if (oldIndex) oldIndex.hidden = true;
  const status = document.createElement('span'); status.className = 'observatory-mark'; status.textContent = 'COSMOS EXPLORER';
  const toggle = document.createElement('button'); toggle.className = 'burger'; toggle.setAttribute('aria-label','Open navigation'); toggle.setAttribute('aria-haspopup','dialog'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-controls','site-navigation'); toggle.innerHTML = '<span></span><span></span>';
  const menu = document.createElement('dialog'); menu.id = 'site-navigation'; menu.className = 'navigation-dialog'; menu.setAttribute('aria-label','Site navigation');
  menu.innerHTML = `<div class="navigation-top"><span>EXPLORE THE OBSERVATORY</span><button class="navigation-close" aria-label="Close navigation">Close ×</button></div><nav><a href="index.html"><small>01 / IMMERSIVE EXPERIENCE</small><strong>The journey</strong></a><a href="planets.html"><small>02 / WORLDS UP CLOSE</small><strong>Planet atlas</strong></a><a href="deep-space.html"><small>03 / BEYOND OUR SUN</small><strong>Deep space</strong></a><a href="observatory.html"><small>04 / OUR PERSPECTIVE</small><strong>The observatory</strong></a></nav><p>A universe to explore. At your own pace.</p>`;
  menu.querySelectorAll('nav a').forEach(a => { if (a.pathname === location.pathname || (a.pathname.endsWith('index.html') && location.pathname.endsWith('/'))) a.setAttribute('aria-current','page'); });
  header.append(status,toggle); document.body.append(menu);
  toggle.addEventListener('click',()=>{ menu.showModal(); toggle.setAttribute('aria-expanded','true'); document.body.classList.add('navigation-open'); });
  menu.querySelector('.navigation-close').addEventListener('click',()=>menu.close());
  menu.addEventListener('close',()=>{ toggle.setAttribute('aria-expanded','false'); document.body.classList.remove('navigation-open'); toggle.focus(); });
})();

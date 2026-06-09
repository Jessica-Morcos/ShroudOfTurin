import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import './styles.css';

const img = (name) => `/assets/img/${name}`;

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useScrollEffects(setScrolled) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;

    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      setScrolled(y > 60);

      if (!reduced) {
        const vh = window.innerHeight;
        document.querySelectorAll('[data-parallax]').forEach((el) => {
          const speed = parseFloat(el.dataset.parallax || '0');
          const r = el.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const shift = -(center - vh / 2) * speed;
          el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
        });
      }

      window.dispatchEvent(new CustomEvent('shroud:scroll', { detail: { y } }));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, [setScrolled]);
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useScrollEffects(setScrolled);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const links = [
    ['About', '#about'],
    ['The Shroud', '#shroud'],
    ['Talks', '#talks'],
    ['Invite', '#invite'],
  ];

  return (
    <>
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="#top" className="brand" onClick={() => setOpen(false)}>Mike&nbsp;Morcous</a>
        <div className="nav-links">
          {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          <a href="#contact" className="nav-cta">Invite to Speak</a>
        </div>
        <button className="nav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        {[...links, ['Invite to Speak', '#contact']].map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
      </div>
    </>
  );
}

function ClothHero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let renderer;
    let raf = 0;
    let scrollAmt = 0;

    const fallback = () => {
      canvas.style.background = `linear-gradient(160deg, rgba(0,0,0,.5), rgba(0,0,0,.2)), url('${img('shroud-cloth.png')}') center/cover`;
    };

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      fallback();
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    scene.add(new THREE.AmbientLight(0xfff3e0, 0.42));
    const key = new THREE.DirectionalLight(0xfff1dc, 0.95);
    key.position.set(-6, 9, 8);
    scene.add(key);
    const warm = new THREE.PointLight(0xff8a3c, 0.55, 40);
    warm.position.set(6, -3, 9);
    scene.add(warm);

    const geo = new THREE.PlaneGeometry(24, 18, 64, 64);
    const basePos = geo.attributes.position.array.slice();
    const tex = new THREE.TextureLoader().load(img('shroud-cloth.png'), undefined, undefined, fallback);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0x856f53,
      roughness: 0.96,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const fit = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const vH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI / 180) / 2);
      const vW = vH * camera.aspect;
      const sx = (vW / 24) * 1.18;
      const sy = (vH / 18) * 1.18;
      mesh.scale.set(sx, sy, 1);

      if (tex.image) {
        const planeAspect = (24 * sx) / (18 * sy);
        const imgAspect = tex.image.width / tex.image.height;
        const r = imgAspect / planeAspect;
        if (r > 1) {
          tex.repeat.set(1 / r, 1);
          tex.offset.set((1 - 1 / r) / 2, 0);
        } else {
          tex.repeat.set(1, r);
          tex.offset.set(0, (1 - r) / 2);
        }
        tex.needsUpdate = true;
      }
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const amp = reduced ? 0.25 : 1;
      const t = performance.now() * 0.001;
      const pos = geo.attributes.position;

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (let i = 0; i < pos.count; i += 1) {
        const ix = i * 3;
        const bx = basePos[ix];
        const by = basePos[ix + 1];
        let z = 0;
        z += Math.sin(bx * 0.45 + t * 0.9) * 0.85;
        z += Math.sin(by * 0.6 - t * 0.7) * 0.55;
        z += Math.cos((bx + by) * 0.3 + t * 1.3) * 0.4;
        const dx = bx - mouse.x * 12;
        const dy = by - mouse.y * 9;
        const d = Math.sqrt(dx * dx + dy * dy);
        z += Math.sin(d * 0.6 - t * 2.2) * 0.6 * Math.exp(-d * 0.12);
        z += scrollAmt * by * 0.04;
        pos.array[ix + 2] = z * amp;
      }

      pos.needsUpdate = true;
      geo.computeVertexNormals();
      mesh.rotation.x = (-mouse.y * 0.12 + 0.04) * amp;
      mesh.rotation.y = mouse.x * 0.14 * amp;
      renderer.render(scene, camera);
    };

    const pointer = (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const scroll = (e) => {
      scrollAmt = Math.max(0, Math.min(1, e.detail.y / window.innerHeight));
    };
    const visibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else animate();
    };

    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('shroud:scroll', scroll);
    window.addEventListener('resize', fit);
    document.addEventListener('visibilitychange', visibility);
    fit();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('shroud:scroll', scroll);
      window.removeEventListener('resize', fit);
      document.removeEventListener('visibilitychange', visibility);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      tex.dispose();
    };
  }, []);

  return <canvas id="cloth-canvas" ref={canvasRef} />;
}

function Hero() {
  return (
    <header className="hero" id="top">
      <ClothHero />
      <div className="hero-veil" />
      <div className="hero-inner">
        <div className="hero-kicker">The Shroud of Turin</div>
        <h1 className="display">Behold<br />The Man<span className="sub">a witness in linen</span></h1>
      </div>
      <a href="#about" className="scroll-cue"><span>Scroll</span><span className="line" /></a>
    </header>
  );
}


function About() {
  return (
    <section className="intro section-pad" id="about">
      <div className="wrap">
        <div className="split">
          <figure className="about-figure" data-reveal data-parallax="0.04">
            <img src={img('mike-mic.png')} alt="Mike Morcous speaking with the Shroud behind him" />
          </figure>
          <div>
            <div className="eyebrow" data-reveal>About Mike</div>
            <h2 className="display about-title" data-reveal>A patient guide to history&apos;s most studied cloth</h2>
            <p data-reveal>Mike Morcous is a volunteer public speaker devoted to sharing the story of the Shroud. His presentations weave together centuries of history, the science of how the image has been examined and debated, and the questions of faith it continues to raise.</p>
            <p data-reveal>His talks are educational and accessible. By bringing a life-size replica into the room, he lets audiences appreciate the Shroud&apos;s detail in person, and leaves space for curiosity, discussion, and reflection.</p>
            <div className="statline" data-reveal>
              <div className="stat"><div className="n">10+</div><div className="l">Years studying<br />the Shroud</div></div>
              <div className="stat"><div className="n">1:1</div><div className="l">Life-size<br />replica</div></div>
              <div className="stat"><div className="n">GTA</div><div className="l">&amp; Niagara<br />region talks</div></div>
            </div>
            <a className="btn" href="#contact" data-reveal style={{ marginTop: '2rem', display: 'inline-flex' }}>Get in touch <span className="arr">→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaceReveal() {
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const copyRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    const face = imgRef.current;
    const copy = copyRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

    const isMobile = () => window.innerWidth <= 920;

    const update = () => {
      if (isMobile()) {
        face.style.filter = 'brightness(1.1) contrast(1)';
        face.style.transform = 'scale(1)';
        copy.style.opacity = '1';
        copy.style.transform = 'none';
        ticking = false;
        return;
      }

      const rect = stage.getBoundingClientRect();
      const range = stage.offsetHeight - window.innerHeight;
      let p = clamp(-rect.top / Math.max(1, range), 0, 1);
      if (reduced) p = 0.6;

      const e = ease(clamp(p / 0.62, 0, 1));
      face.style.filter = `brightness(${(0.45 + e * 0.8).toFixed(3)}) contrast(${(0.8 + e * 0.3).toFixed(3)}) blur(${((1 - e) * 22).toFixed(2)}px)`;
      face.style.transform = `scale(${(1.12 - e * 0.12).toFixed(3)})`;

      const c = clamp((p - 0.28) / 0.3, 0, 1);
      copy.style.opacity = c.toFixed(3);
      copy.style.transform = `translateY(${((1 - c) * 26).toFixed(1)}px)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <section className="reveal-sec" id="face">
      <div className="reveal-stage" ref={stageRef}>
        <div className="reveal-sticky">
          <div className="reveal-frame">
           
            <div ref={imgRef} className="reveal-pos" style={{ backgroundImage: `url(${img('enrie-hires.jpg')})` }} />
          </div>
          <div className="reveal-copy" ref={copyRef}>
            <div className="eyebrow">The Shroud of Turin</div>
            <h2 className="display">History&apos;s most studied cloth</h2>
            <p className="muted">The Shroud of Turin is a linen cloth bearing the image of a crucified man. Despite more than a century of scientific study, no one can explain how the image was formed. For many, it is the burial cloth of Jesus; for all, it remains an enduring mystery</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const hotspots = [
  // Frontal (ventral) image — feet far left, head at center-left (~x=46%)
  ['35', '22', '3.2', '1532 Fire Damage','Burn marks and the Poor Clare repair patches','The triangular linen patches and parallel scorch lines result from the 1532 fire in Chambéry, France, when molten silver from the reliquary dripped onto the folded cloth. Because the cloth was folded, burns appear in symmetric pairs along its length. Poor Clare nuns repaired the worst holes with patches still visible as lighter rectangles. '],
  ['28', '50', '4.0', 'Wrist Wound',     'Nail wound at the wrist, not the palm',     'The nail wound appears in the wrist at the "Space of Destot," not the palm as in traditional iconography. Surgeon Dr. Pierre Barbet showed that nails through the palm tear out under body weight; only the carpal bones of the wrist can bear it. Piercing the median nerve here causes the thumb to involuntarily fold inward — which is why no thumbs are visible on the image.'],
  ['30', '57', '4.0', 'Arm Blood Stains', 'Rivulets running from the wrist wounds down both forearms. ','Two flow angles suggest the arms shifted between positions during crucifixion.'],
  ['35', '55', '3.8', 'Side Wound',      'The lance wound between the ribs',          'A large oval blood stain is visible on the right side of the chest between the 5th and 6th ribs. The Gospel of John (19:34) records that "blood and water" flowed from this wound. Medical researchers associate the separation of fluids with post-mortem serum separation, indicating the lance was thrust after death. The stain measures approximately 4.4 × 1.1 cm.'],
  ['43', '40', '4.2', 'Facial Wounds',   'Bruising, swelling, and blows to the face', 'The face shows a swollen right cheek, nasal deviation consistent with a severe blow or fracture, and multiple abrasions. These match the Gospel accounts of guards striking Jesus during his trial'],
  ['47', '45', '4.2', 'Crown of Thorns', 'A helmet of thorns','Unlike the ring-crown of traditional artwork, puncture wounds cover the entire scalp — consistent with a cap or helmet of thorns. Researchers count at least 30 puncture sites. A rivulet of blood on the forehead forms a reversed "3" shape'],
  // Dorsal (back) image — head at center-right (~x=53%), feet far right (~x=90%)
  ['62', '47', '3.2', 'Scourge Marks',   'Over 100 flagrum wounds across the back',   'Dumbbell-shaped marks cover the back, shoulders, and legs — researchers count more than 100 individual impacts. Each is consistent with a Roman flagrum: a whip with leather thongs tipped with lead balls or calcified sheep knuckle-bones. The marks appear at two distinct angles, indicating two soldiers, one on each side, took turns flogging.'],
  ['65', '44', '3.2', 'Blood from Side Wound', 'Blood that drained from the lance wound in the side. ', 'When the body was carried flat to the tomb, the pooled blood ran sideways across the lower back, leaving the wide transverse stain known as the "blood belt."'],
  ['75', '18', '3.2', 'Poker Holes', 'Sets of small burn holes in an L-shaped pattern.', 'They predate the 1532 fire. One theory holds they were made accidentally during a liturgy, by burning incense falling on the cloth. The same L-shaped marks appear on the Pray Codex, a Hungarian manuscript dated to around 1192-1195, which is one of the arguments against the medieval radiocarbon date.'],
  ['92', '45', '3.2', 'Both Feet', 'Bloody footprints on the dorsal image.', 'The right foot was placed over the left and a single nail driven through both, so the right leaves a fuller print while the left is partial. Blood from the nail wound pooled at the soles and transferred where the feet pressed flat against the linen. The positioning matches a body hanging and shifting on a cross rather than one artistically arranged.']
];

function Explorer() {
  const vpRef = useRef(null);
  const cvRef = useRef(null);
  const clothRef = useRef(null);
  const state = useRef({ scale: 1, x: 0, y: 0, dragging: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [readout, setReadout] = useState(null);
  const [hint, setHint] = useState(true);
  const [active, setActive] = useState(null);

  const apply = (anim = false) => {
    const { scale, x, y } = state.current;
    cvRef.current.style.transition = anim ? 'transform .7s cubic-bezier(.22,1,.36,1)' : 'none';
    cvRef.current.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
  };

  const clampPan = () => {
    const vp = vpRef.current;
    const cloth = clothRef.current;
    const s = state.current;
    const vr = vp.getBoundingClientRect();
    const cw = cloth.offsetWidth * s.scale;
    const ch = cloth.offsetHeight * s.scale;
    const mx = Math.max(0, (cw - vr.width) / 2 + 80);
    const my = Math.max(0, (ch - vr.height) / 2 + 80);
    s.x = Math.max(-mx, Math.min(mx, s.x));
    s.y = Math.max(-my, Math.min(my, s.y));
  };

  const zoomBy = (factor) => {
    state.current.scale = Math.max(0.85, Math.min(4.5, state.current.scale * factor));
    clampPan();
    apply(true);
    setHint(false);
  };

  const reset = () => {
    state.current.scale = 1;
    state.current.x = 0;
    state.current.y = 0;
    setReadout(null);
    setActive(null);
    apply(true);
  };

  useEffect(() => {
    const vp = vpRef.current;
    const onPointerMove = (e) => {
      const s = state.current;
      if (!s.dragging) return;
      s.x = s.ox + (e.clientX - s.sx);
      s.y = s.oy + (e.clientY - s.sy);
      if (Math.abs(e.clientX - s.sx) + Math.abs(e.clientY - s.sy) > 4) {
        s.moved = true;
        setHint(false);
      }
      clampPan();
      apply(false);
    };
    const endDrag = () => {
      state.current.dragging = false;
      vp.classList.remove('grabbing');
    };
    const onWheel = (e) => {
      e.preventDefault();
      const s = state.current;
      const before = s.scale;
      s.scale = Math.max(0.85, Math.min(4.5, s.scale * (e.deltaY < 0 ? 1.12 : 0.89)));
      const vr = vp.getBoundingClientRect();
      const cxp = e.clientX - vr.left - vr.width / 2 - s.x;
      const cyp = e.clientY - vr.top - vr.height / 2 - s.y;
      const k = s.scale / before - 1;
      s.x -= cxp * k;
      s.y -= cyp * k;
      clampPan();
      apply(false);
      setHint(false);
    };
    const onResize = () => {
      clampPan();
      apply(false);
    };

    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);
    vp.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);
    apply(false);

    return () => {
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', endDrag);
      vp.removeEventListener('pointercancel', endDrag);
      vp.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const startDrag = (e) => {
    if (e.target.closest('.hotspot') || e.target.closest('.zbtn') || e.target.closest('.explore-readout')) return;
    const s = state.current;
    s.dragging = true;
    s.moved = false;
    s.sx = e.clientX;
    s.sy = e.clientY;
    s.ox = s.x;
    s.oy = s.y;
    vpRef.current.classList.add('grabbing');
    vpRef.current.setPointerCapture(e.pointerId);
  };

  const chooseHotspot = (i) => {
    const h = hotspots[i];
    const s = state.current;
    const cloth = clothRef.current;
    setReadout({ k: h[3], title: h[4], desc: h[5] });
    setActive(i);
    setHint(false);

    const tx = parseFloat(h[0]);
    const ty = parseFloat(h[1]);
    const ts = parseFloat(h[2]);
    const px = (tx / 100 - 0.5) * cloth.offsetWidth;
    const py = (ty / 100 - 0.5) * cloth.offsetHeight;
    s.scale = ts;
    s.x = -px * ts;
    s.y = -py * ts;
    clampPan();
    apply(true);
  };

  return (
    <section className="explore section-pad" id="shroud">
      <div className="wrap">
        <div className="explore-head">
          <div>
            <div className="eyebrow" data-reveal>Explore the cloth</div>
            <h2 className="display" data-reveal>The Shroud, up close</h2>
          </div>
          <p className="muted" data-reveal>Drag along the full length of the linen. Scroll or use the controls to zoom. Tap a marker to learn what it reveals.</p>
        </div>

        <div className="explore-wrap">
          <div className="explore-viewport" ref={vpRef} data-reveal onPointerDown={startDrag}>
            <div className="explore-canvas" ref={cvRef}>
              <div className="explore-cloth full-length landscape" ref={clothRef} style={{ backgroundImage: `url(${img('shroud-full-landscape.jpg')})` }}>
                {hotspots.map((h, i) => (
                  <button
                    key={h[4]}
                    className={`hotspot ${active === i ? 'active' : ''}`}
                    style={{ left: `${h[0]}%`, top: `${h[1]}%` }}
                    aria-label={h[4]}
                    onClick={(e) => {
                      e.stopPropagation();
                      chooseHotspot(i);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className={`explore-readout desktop-readout ${readout ? 'show' : ''}`}>
              <div className="k">{readout?.k || 'Tap a marker'}</div>
              <h4>{readout?.title || 'Nine wounds to examine'}</h4>
              <p>{readout?.desc || 'Each marker zooms into a specific wound or mark on the cloth and explains what it is, what caused it, and why researchers consider it significant.'}</p>
            </div>

            <div className="explore-controls">
              <button className="zbtn" onClick={() => zoomBy(0.8)} aria-label="Zoom out">-</button>
              <button className="zbtn" onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
              <button className="zbtn reset" onClick={reset} aria-label="Reset">↺</button>
            </div>
            <div className="explore-hint" style={{ opacity: hint ? 1 : 0 }}>Drag · Zoom · Tap markers</div>
          </div>

          <div className={`explore-readout mobile-readout ${readout ? 'show' : ''}`}>
            <div className="k">{readout?.k || 'Tap a marker'}</div>
            <h4>{readout?.title || 'Nine wounds to examine'}</h4>
            <p>{readout?.desc || 'Each marker zooms into a specific wound or mark on the cloth and explains what it is, what caused it, and why researchers consider it significant.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const items = [
    ['g-pointing.png', 'g1'],
    ['g-church.png', 'g2'],
    ['g-group.png', 'g3'],
    ['g-talk.png', 'g4'],
    ['g-convo.png', 'g5'],
    ['g-room.png', 'g6'],
  ];

  return (
    <section className="gallery section-pad" id="gallery">
      <div className="wrap">
        <div className="eyebrow center" data-reveal>From the road</div>
        <h2 className="display gallery-title" data-reveal>Moments from past talks</h2>
        <div className="gallery-grid">
          {items.map(([src, cls]) => (
            <div key={src} className={`ph ${cls}`} data-reveal style={{ backgroundImage: `url(${img(src)})` }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Talks() {
  const cards = [
    ['https://img.youtube.com/vi/AhiiA-HskfI/maxresdefault.jpg', "Behold the Man: An introduction to the Shroud of Turin by Mike Morcous", 'Parish talk · 48 min', 'https://www.youtube.com/live/AhiiA-HskfI?si=CZUlq1zq0WMWVI1k'],
    ['g-group.png', 'History, blood & the carbon-dating debate', 'Evening lecture · 55 min', 'https://www.youtube.com'],
    ['g-talk.png', 'Standing before the replica: a Q&A', 'Community night · 40 min', 'https://www.youtube.com'],
  ];

  return (
    <section className="video section-pad" id="talks">
      <div className="wrap">
        <div className="explore-head">
          <div>
            <div className="eyebrow" data-reveal>Watch</div>
            <h2 className="display" data-reveal>Mike&apos;s past talks</h2>
          </div>
          <a className="btn ghost" href="https://www.youtube.com" target="_blank" rel="noreferrer" data-reveal>On YouTube <span className="arr">→</span></a>
        </div>
        <div className="video-grid">
          {cards.map(([thumb, title, label, url], i) => (
            <a className="video-card" href={url} target="_blank" rel="noreferrer" data-reveal style={{ '--reveal-delay': `${i * 90}ms` }} key={title}>
              <div className="video-thumb ph" style={{ backgroundImage: `url(${thumb.startsWith('http') ? thumb : img(thumb)})` }}><div className="play"><span /></div></div>
              <div className="video-meta"><h4>{title}</h4><div className="l">{label}</div></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Invite() {
  return (
    <section className="invite section-pad" id="invite">
      <div className="wrap">
        <div className="eyebrow center" data-reveal>Bring the Shroud to your community</div>
        <h2 className="display" data-reveal>Invite Mike to speak</h2>
        <p className="lede" data-reveal>Mike brings the full-size replica and a warm, accessible talk to parishes, schools, and gatherings, at no cost. Audiences leave having stood, quite literally, before the Man of the Shroud.</p>
        <a className="btn" href="#contact" data-reveal>Plan a talk <span className="arr">→</span></a>
        <div className="regions" data-reveal>
          {['Toronto / GTA', 'Niagara', 'Hamilton', 'Mississauga', '& surrounding'].map((r) => <span className="region-chip" key={r}>{r}</span>)}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const email = e.target.email.value;
    const message = e.target.message.value;
    const subject = encodeURIComponent('Talk inquiry from ' + name);
    const body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message);
    window.location.href = 'mailto:m_morcous@yahoo.ca?subject=' + subject + '&body=' + body;
    setNote('Your email client should open with the message ready to send.');
  };

  return (
    <section className="contact section-pad" id="contact">
      <div className="wrap">
        <div className="contact-grid">
          <div>
            <div className="eyebrow" data-reveal>Get in touch</div>
            <h2 className="display contact-title" data-reveal>Contact Mike</h2>
            <form data-reveal onSubmit={handleSubmit}>
              <div className="field"><label htmlFor="cf-name">Your name</label><input id="cf-name" name="name" type="text" required /></div>
              <div className="field"><label htmlFor="cf-email">Email address</label><input id="cf-email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="cf-msg">Your message</label><textarea id="cf-msg" name="message" rows="4" required placeholder="Tell Mike about your parish or event, and a few possible dates..." /></div>
              <button className="btn" type="submit">Send message <span className="arr">→</span></button>
              <div className="form-note" role="status">{note}</div>
            </form>
          </div>
          <aside className="contact-aside" data-reveal>
            <h4>Email</h4>
            <a className="big" href="mailto:m_morcous@yahoo.ca">m_morcous@yahoo.ca</a>
            <h4>Follow</h4>
            <a className="social-link" href="https://www.youtube.com" target="_blank" rel="noreferrer">▶ YouTube</a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <span className="brand">Mike Morcous</span>
      <small>The Shroud of Turin · Talks across the GTA &amp; Niagara</small>
    </footer>
  );
}

function App() {
  useReveal();

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <FaceReveal />
        <Explorer />
        <Talks />
        <Gallery />
        <Invite />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

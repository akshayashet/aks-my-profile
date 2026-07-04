export default function decorate(block) {
        // Entry point: function called to decorate the carousel block element
        // Convert the block's children NodeList into a mutable Array
        const sourceSlides = Array.from(block.children); // sourceSlides: array of immediate child nodes
        if (!sourceSlides.length) return; // if there are no children, nothing to do

        // Helper: check whether a slide appears to be an icon-only slide
        function isIconSlide(slide) {
                // collect <img> elements inside the slide
                const imgs = Array.from(slide.querySelectorAll('img'));
                // determine if all images are small (<=48px width or height)
                const hasSmallImg = imgs.length > 0 && imgs.every((img) => {
                        const w = parseInt(img.getAttribute('width'), 10) || 0; // parse width attribute
                        const h = parseInt(img.getAttribute('height'), 10) || 0; // parse height attribute
                        return (w > 0 && w <= 48) || (h > 0 && h <= 48); // true if small
                });
                // get textual content and normalize whitespace
                const text = (slide.textContent || '').replace(/\s+/g, ' ').trim();
                const hasSignificantText = text.length > 8; // heuristic: >8 chars counts as content
                return hasSmallImg && !hasSignificantText; // icon slide if small images and no text
        }

        // Find slides that look like icon containers
        const iconSlides = sourceSlides.filter((s) => isIconSlide(s));

        // Helper to extract a usable image src from an icon slide
        function findImgSrcFromSlide(slide) {
            const img = slide.querySelector('img'); // prefer <img>
            if (img) return img.getAttribute('src') || img.src || null; // return src or null
            const source = slide.querySelector('source'); // fallback to <source>
            if (source) return source.getAttribute('srcset') || null; // return srcset if present
            return null; // no image source found
        }

        // Use first icon slide as prev icon and last icon slide as next icon (if present)
        const prevIconSrc = iconSlides.length ? findImgSrcFromSlide(iconSlides[0]) : null;
        const nextIconSrc = iconSlides.length > 1 ? findImgSrcFromSlide(iconSlides[iconSlides.length - 1]) : null;

        // Remove icon slides from the DOM so they don't appear as carousel slides
        iconSlides.forEach((s) => s.remove());

        // Build the slide set excluding icon slides
        const slides = sourceSlides.filter((s) => !isIconSlide(s));
        // fallback: if filtering removed everything, use original slides to avoid empty carousel
        const effectiveSlides = slides.length ? slides : sourceSlides;

        // Create a track element that will hold the slides and animate via transform
        const track = document.createElement('div');
        track.className = 'carousel-track';

        // Move each effective slide into the track element
        effectiveSlides.forEach((s) => track.appendChild(s));

        // Create a viewport to clip slides (keeps only one slide visible)
        const viewport = document.createElement('div');
        viewport.className = 'carousel-viewport';
        viewport.appendChild(track);

        // Append viewport to the block and mark the block with a class
        block.appendChild(viewport);
        block.classList.add('carousel-block');

        // Extract and store slide data for consistent info rendering
        const slideData = [];
        Array.from(track.children).forEach((slide) => {
                // ensure slide has base class and is positioned relative for overlays
                slide.classList.add('carousel-slide');
                if (!slide.style.position) slide.style.position = 'relative';

                // find title, paragraph and link anywhere inside the slide
                const titleEl = slide.querySelector('h1,h2,h3');
                const pEl = slide.querySelector('p');
                const linkEl = slide.querySelector('a');
                const title = titleEl ? titleEl.textContent.trim() : '';
                const desc = pEl ? pEl.textContent.trim() : '';
                const linkHref = linkEl ? linkEl.href : '';
                const linkText = linkEl ? linkEl.textContent.trim() : '';
                                slideData.push({ title, desc, linkHref, linkText });
                                // Remove inner wrapper divs that contain heading+paragraph so
                                // the slide content doesn't duplicate the info card.
                                Array.from(slide.querySelectorAll('div')).forEach((d) => {
                                        if (d.querySelector && d.querySelector('h1,h2,h3') && d.querySelector('p')) {
                                                d.remove();
                                        }
                                });
        });

        // Create previous control button
        const prev = document.createElement('button');
        prev.className = 'carousel-prev';
        prev.setAttribute('aria-label', 'Previous slide');
        if (prevIconSrc) {
            // if we found an icon src, create an <img> inside the button
            const pi = document.createElement('img');
            pi.src = prevIconSrc; // set image source
            pi.alt = 'Previous'; // accessibility alt text
            pi.className = 'carousel-control-icon';
            prev.appendChild(pi); // add image to button
        } else {
            // fallback: use a text arrow
            prev.innerText = '‹';
        }

        // Create next control button
        const next = document.createElement('button');
        next.className = 'carousel-next';
        next.setAttribute('aria-label', 'Next slide');
        if (nextIconSrc) {
            // create img inside next button when available
            const ni = document.createElement('img');
            ni.src = nextIconSrc; // set image source
            ni.alt = 'Next';
            ni.className = 'carousel-control-icon';
            next.appendChild(ni);
        } else {
            // fallback text arrow
            next.innerText = '›';
        }

                // Append controls after the track
                block.append(prev, next);

                // Pagination dots container: one dot per slide
                const dotsWrap = document.createElement('div');
                dotsWrap.className = 'carousel-dots';
                for (let i = 0; i < track.children.length; i += 1) {
                        const d = document.createElement('button');
                        d.className = 'carousel-dot';
                        d.setAttribute('aria-label', `Go to slide ${i + 1}`);
                        d.addEventListener('click', () => {
                                index = i;
                                update();
                        });
                        dotsWrap.appendChild(d);
                }
                block.appendChild(dotsWrap);

                // Create an info card below the carousel to display title/description
                const infoCard = document.createElement('aside');
                infoCard.className = 'carousel-info';
                const infoLeft = document.createElement('div');
                infoLeft.className = 'carousel-info-left';
                const infoRight = document.createElement('div');
                infoRight.className = 'carousel-info-right';
                infoCard.append(infoLeft, infoRight);
                block.appendChild(infoCard);

        // current slide index (0-based)
        let index = 0;
        // number of slides in the track
        const count = track.children.length;

        // Update visual position and accessibility attributes
        function update() {
                // translate track to show the current index slide
                track.style.transform = `translateX(-${index * 100}%)`;
                // set aria-hidden on non-visible slides for screen readers
                Array.from(track.children).forEach((c, i) => {
                        c.setAttribute('aria-hidden', i !== index);
                });
                                // update dots active state if dots exist
                                const dots = dotsWrap ? Array.from(dotsWrap.children) : [];
                                dots.forEach((d, i) => d.classList.toggle('active', i === index));
                                // update info card content based on stored slideData
                                if (infoCard) {
                                        const data = slideData[index] || {};
                                        const left = infoCard.querySelector('.carousel-info-left');
                                        const right = infoCard.querySelector('.carousel-info-right');
                                        left.innerHTML = '';
                                        right.innerHTML = '';
                                        if (data.title) {
                                                const h = document.createElement('h2');
                                                h.textContent = data.title;
                                                left.appendChild(h);
                                        }
                                        if (data.desc) {
                                                const p = document.createElement('p');
                                                p.textContent = data.desc;
                                                left.appendChild(p);
                                        }
                                        if (data.linkHref) {
                                                const a = document.createElement('a');
                                                a.href = data.linkHref;
                                                a.textContent = data.linkText || 'View full collection →';
                                                a.className = 'carousel-info-link';
                                                right.appendChild(a);
                                        }
                                }
        }

        // Move index by delta (positive or negative) and update
        function go(delta) {
                index = (index + delta + count) % count; // wrap-around math
                update(); // apply changes
        }

        // wire click events for controls
        prev.addEventListener('click', () => go(-1));
        next.addEventListener('click', () => go(1));

        // allow keyboard navigation when block is focused
        block.tabIndex = 0; // make block focusable
        block.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') go(-1); // left arrow -> previous
                if (e.key === 'ArrowRight') go(1); // right arrow -> next
        });

        // Autoplay: cycles slides automatically but pauses on hover/focus
        let autoplayId = null; // holds interval id
        function startAutoplay() {
                if (autoplayId) return; // already running
                autoplayId = setInterval(() => go(1), 5000); // advance every 5s
        }
        function stopAutoplay() {
                if (!autoplayId) return; // not running
                clearInterval(autoplayId); // stop interval
                autoplayId = null;
        }
        // pause when user interacts
        block.addEventListener('mouseenter', stopAutoplay);
        block.addEventListener('mouseleave', startAutoplay);
        block.addEventListener('focusin', stopAutoplay);
        block.addEventListener('focusout', startAutoplay);

        // Ensure slides have slide class for CSS sizing and set initial state
        Array.from(track.children).forEach((c) => c.classList.add('carousel-slide'));
                update(); // position track
                startAutoplay(); // begin autoplay

                // Touch / swipe support for mobile
                let touchStartX = 0;
                let touchDeltaX = 0;
                block.addEventListener('touchstart', (e) => {
                        stopAutoplay();
                        touchStartX = e.touches[0].clientX;
                        touchDeltaX = 0;
                }, { passive: true });
                block.addEventListener('touchmove', (e) => {
                        touchDeltaX = e.touches[0].clientX - touchStartX;
                }, { passive: true });
                block.addEventListener('touchend', () => {
                        if (Math.abs(touchDeltaX) > 40) {
                                go(touchDeltaX > 0 ? -1 : 1);
                        }
                        touchStartX = 0;
                        touchDeltaX = 0;
                        startAutoplay();
                });
}
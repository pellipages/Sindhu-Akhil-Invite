/* =========================================================
   TAP-THROUGH INVITATION — SCENE ENGINE

   Replaces the old scrolling flow from script.js
   (script.js is no longer loaded by index.html; it, hero.html,
   journey.html and location.html are left untouched).

   How it works
   - Each scene has a TIMELINE: a list of [milliseconds,
     selector] steps. At that time the matching elements get
     the class "in", and scenes.css decides how they arrive.
   - Tap while a scene is still entering  → the scene
     completes instantly (consistent "skip" behaviour).
   - Tap once it is complete              → next scene.
   - A short lock after every skip/advance means a quick
     double tap can never jump over a scene.
   - Nothing ever auto-advances.
========================================================= */

(function () {

    "use strict";

    /* -----------------------------------------------------
       TIMELINES (ms from the moment a scene starts)

       [time, "css selector, css selector"]
       [time, function]  → custom step
       "done" marks the scene complete.
    ----------------------------------------------------- */

    var TIMELINES = {

        opening: [
            [250,  ".sc-banana-r"],
            [480,  ".sc-banana-l"],
            [1250, ".sc-lamp-a"],
            [1500, ".sc-lamp-b"],
            [2500, ".sc-kolam, .sc-lotus"],
            [3500, ".sc-parrot"],
            [4000, ".sc-ganesha"],
            [5900, ".sc-request"],
            [6900, ".sc-bride"],
            [7900, ".sc-with"],
            [8300, ".sc-groom"],
            [9600, "done"]
        ],

        date: [
            [200,  ".sc-banana-r"],
            [420,  ".sc-banana-l"],
            [900,  ".sc-lotus"],
            [1700, ".sc-eyebrow"],
            [2400, ".sc-card"],
            [3900, "done"]
        ],

        ceremony: [
            [200,  ".sc-lamp-c"],
            [450,  ".sc-lamp-d"],
            [900,  ".sc-banana-l"],
            [1150, ".sc-banana-r"],
            [1900, ".sc-dais"],
            [3900, ".sc-orn"],
            [4300, "type"],
            [4300 + 23 * 68 + 700, "done"]
        ],

        pelli: [
            [200,  ".sc-strip"],
            [500,  ".sc-lamp-e"],
            [750,  ".sc-lamp-f"],
            [1100, ".sc-lotus"],
            [1900, ".sc-pelli-art"],
            [3400, ".sc-pelli-title"],
            [4100, ".sc-rule-pelli"],
            [4500, ".sc-pelli-line:not(.sc-pelli-time)"],
            [5000, ".sc-pelli-time"],
            [5600, ".sc-pelli-tagline"],
            [6700, "done"]
        ],

        venue: [
            [250,  ".sc-banana-r, .sc-lotus"],
            [700,  ".sc-venue-head"],
            [1300, ".sc-venue-details"],
            [1900, ".sc-map"],
            [2400, ".sc-venue-foot"],
            [2900, "done"]
        ]

    };

    var EXIT_MS = 650;          /* matches .sc.leaving in CSS  */
    var EXIT_FAST_MS = 380;     /* back / replay               */
    var TAP_LOCK_MS = 420;      /* guards accidental double tap */


    /* -----------------------------------------------------
       ELEMENTS
    ----------------------------------------------------- */

    var root = document.getElementById("mainInvite");
    var stage = document.getElementById("stage");

    if (!root || !stage) {
        return;
    }

    var scenes = Array.prototype.slice.call(
        stage.querySelectorAll(".sc")
    );

    var progress = document.getElementById("scProgress");
    var segments = progress ? progress.querySelectorAll("i") : [];
    var btnBack = document.getElementById("scBack");
    var btnNext = document.getElementById("scNext");
    var btnReplay = document.getElementById("scReplay");

    var reducedQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );


    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */

    var current = -1;
    var state = "idle";       /* idle | entering | ready | transitioning */
    var timers = [];
    var lockUntil = 0;
    var started = false;


    function reduced() {
        return reducedQuery.matches;
    }

    function syncReducedClass() {
        root.classList.toggle("reduced", reduced());
    }

    syncReducedClass();

    if (reducedQuery.addEventListener) {
        reducedQuery.addEventListener("change", syncReducedClass);
    }


    /* -----------------------------------------------------
       TIMER HELPERS
       Every timer is tracked so a scene change can cancel
       every pending callback (no stale steps).
    ----------------------------------------------------- */

    function later(fn, ms) {
        var id = window.setTimeout(fn, ms);
        timers.push(id);
        return id;
    }

    function clearTimers() {
        timers.forEach(function (id) {
            window.clearTimeout(id);
        });
        timers = [];
    }


    /* -----------------------------------------------------
       TYPEWRITER
       Splits text into grapheme clusters (Intl.Segmenter)
       so combined characters are never cut in half.
       All letters are in the layout from the start (opacity
       0), so the line never reflows while being typed.
    ----------------------------------------------------- */

    var promise = document.getElementById("promise");
    var typed = [];

    function graphemes(text) {
        if (window.Intl && Intl.Segmenter) {
            var seg = new Intl.Segmenter(undefined, {
                granularity: "grapheme"
            });
            return Array.from(seg.segment(text), function (s) {
                return s.segment;
            });
        }
        return Array.from(text);
    }

    function buildTypewriter() {

        if (!promise) {
            return;
        }

        var text = promise.getAttribute("data-text") || "";

        promise.setAttribute("aria-label", text);
        promise.textContent = "";

        var wrap = document.createElement("span");
        wrap.setAttribute("aria-hidden", "true");

        var word = null;

        graphemes(text).forEach(function (g) {

            if (g === " ") {
                word = null;
                var sp = document.createElement("span");
                sp.className = "sp";
                wrap.appendChild(sp);
                return;
            }

            if (!word) {
                word = document.createElement("span");
                word.className = "w";
                wrap.appendChild(word);
            }

            var c = document.createElement("span");
            c.className = "c";
            c.textContent = g;
            word.appendChild(c);
            typed.push(c);
        });

        promise.appendChild(wrap);
    }

    function startTyping() {

        if (!typed.length) {
            return;
        }

        if (reduced()) {
            finishTyping();
            return;
        }

        typed.forEach(function (c, i) {
            later(function () {
                c.classList.add("on");
            }, i * 68);
        });
    }

    function finishTyping() {
        typed.forEach(function (c) {
            c.classList.add("on");
        });
    }

    function resetTyping() {
        typed.forEach(function (c) {
            c.classList.remove("on");
        });
    }

    buildTypewriter();


    /* -----------------------------------------------------
       SCENE LIFECYCLE
    ----------------------------------------------------- */

    function targets(scene, selector) {
        return scene.querySelectorAll(selector);
    }

    function addIn(scene, selector) {
        Array.prototype.forEach.call(
            targets(scene, selector),
            function (el) {
                el.classList.add("in");
            }
        );
    }

    function setReady(on) {
        root.setAttribute("data-ready", on ? "1" : "0");
    }

    function markDone(scene) {
        scene.classList.add("done");
        state = "ready";
        setReady(true);
    }

    /* put a scene back to its hidden starting point */

    function resetScene(scene) {

        scene.classList.remove(
            "active",
            "leaving",
            "instant",
            "done"
        );

        Array.prototype.forEach.call(
            scene.querySelectorAll(".in"),
            function (el) {
                el.classList.remove("in");
            }
        );

        if (scene.id === "scene-ceremony") {
            resetTyping();
        }

        scene.inert = true;
        scene.setAttribute("aria-hidden", "true");
    }

    /* show every element of a scene in its finished state */

    function completeScene(scene) {

        var name = scene.getAttribute("data-scene");
        var steps = TIMELINES[name] || [];

        scene.classList.add("instant");

        steps.forEach(function (step) {
            if (typeof step[1] === "string" &&
                step[1] !== "done" &&
                step[1] !== "type") {
                addIn(scene, step[1]);
            }
        });

        if (name === "ceremony") {
            finishTyping();
        }

        markDone(scene);
    }

    function loadVenueMap(scene) {

        var frame = scene.querySelector("iframe[data-src]");

        if (frame && !frame.getAttribute("src")) {
            frame.setAttribute(
                "src",
                frame.getAttribute("data-src")
            );
        }
    }

    function enter(index, instant) {

        var scene = scenes[index];
        var name = scene.getAttribute("data-scene");

        current = index;

        resetScene(scene);

        scene.inert = false;
        scene.removeAttribute("aria-hidden");
        scene.classList.add("active");

        if (scrollerOf(scene)) {
            scrollerOf(scene).scrollTop = 0;
        }

        if (name === "venue") {
            loadVenueMap(scene);
        }

        updateUI();
        setReady(false);

        if (instant) {
            completeScene(scene);
            lockUntil = Date.now() + TAP_LOCK_MS;
            return;
        }

        state = "entering";

        var scale = reduced() ? 0.12 : 1;

        (TIMELINES[name] || []).forEach(function (step) {

            var when = step[0] * scale;
            var what = step[1];

            later(function () {

                if (scenes[current] !== scene) {
                    return;     /* stale callback */
                }

                if (what === "done") {
                    markDone(scene);
                } else if (what === "type") {
                    startTyping();
                } else {
                    addIn(scene, what);
                }

            }, when);
        });

        lockUntil = Date.now() + 250;
    }

    function scrollerOf(scene) {
        return scene.querySelector(".sc-scroll");
    }


    /* -----------------------------------------------------
       NAVIGATION
    ----------------------------------------------------- */

    function go(index, instantArrival) {

        if (index < 0 || index >= scenes.length || index === current) {
            return;
        }

        if (state === "transitioning") {
            return;
        }

        var leaving = scenes[current];

        state = "transitioning";
        setReady(false);
        clearTimers();

        if (leaving) {
            leaving.classList.remove("active");
            leaving.classList.add("leaving");
            leaving.inert = true;
        }

        current = index;       /* so the UI reflects the target */
        updateUI();

        var wait = instantArrival ? EXIT_FAST_MS : EXIT_MS;

        window.setTimeout(function () {

            if (leaving) {
                resetScene(leaving);
            }

            enter(index, instantArrival);

        }, wait);
    }

    function next() {
        if (current < scenes.length - 1) {
            go(current + 1, false);
        }
    }

    function back() {
        if (current > 0) {
            go(current - 1, true);
        }
    }

    function replay() {
        if (current !== 0) {
            go(0, false);
        }
    }

    /* tap / click on the scene itself */

    function advance() {

        if (Date.now() < lockUntil) {
            return;
        }

        if (state === "transitioning" || state === "idle") {
            return;
        }

        if (state === "entering") {

            /* first tap completes the scene instantly */

            clearTimers();
            completeScene(scenes[current]);
            lockUntil = Date.now() + TAP_LOCK_MS;
            return;
        }

        if (state === "ready") {
            lockUntil = Date.now() + TAP_LOCK_MS;
            next();
        }
    }

    function updateUI() {

        var last = scenes.length - 1;

        Array.prototype.forEach.call(segments, function (seg, i) {
            seg.className =
                i < current ? "done" :
                i === current ? "now" : "";
        });

        if (progress) {
            progress.setAttribute(
                "aria-label",
                "Scene " + (current + 1) + " of " + scenes.length
            );
        }

        if (btnBack) {
            btnBack.disabled = current <= 0;
        }

        if (btnNext) {
            btnNext.disabled = current >= last;
        }

        root.setAttribute("data-last", current === last ? "1" : "0");
    }


    /* -----------------------------------------------------
       INPUT
    ----------------------------------------------------- */

    stage.addEventListener("click", function (event) {

        if (event.target.closest("a, button, iframe")) {
            return;
        }

        /* on the last scene advance() has nowhere to go */

        advance();
    });

    if (btnNext) {
        btnNext.addEventListener("click", function () {
            if (Date.now() < lockUntil) {
                return;
            }
            if (state === "entering") {
                advance();
                return;
            }
            if (state === "ready") {
                lockUntil = Date.now() + TAP_LOCK_MS;
                next();
            }
        });
    }

    if (btnBack) {
        btnBack.addEventListener("click", function () {
            if (state === "transitioning" || state === "idle") {
                return;
            }
            clearTimers();
            lockUntil = Date.now() + TAP_LOCK_MS;
            back();
        });
    }

    if (btnReplay) {
        btnReplay.addEventListener("click", function () {
            if (state === "transitioning") {
                return;
            }
            lockUntil = Date.now() + TAP_LOCK_MS;
            replay();
        });
    }

    document.addEventListener("keydown", function (event) {

        if (!started || !document.body.classList.contains("invite-open")) {
            return;
        }

        var tag = event.target && event.target.tagName;
        var onControl = tag === "BUTTON" || tag === "A" || tag === "IFRAME";

        if (event.key === "ArrowRight" ||
            event.key === "PageDown" ||
            ((event.key === " " || event.key === "Enter") && !onControl)) {

            event.preventDefault();
            advance();

        } else if (event.key === "ArrowLeft" ||
                   event.key === "PageUp") {

            event.preventDefault();

            if (state !== "transitioning") {
                clearTimers();
                lockUntil = Date.now() + TAP_LOCK_MS;
                back();
            }
        }
    });


    /* -----------------------------------------------------
       ENVELOPE → INVITATION
       openInvite() keeps the same name and timing it had in
       script.js because index.html calls it from onclick.
    ----------------------------------------------------- */

    var invitationOpening = false;

    /* the names and headings use self-hosted web fonts: wait for
       them (max 2.5 s) so nothing is revealed in a fallback face */

    function whenFontsReady(done) {

        var finished = false;

        function go() {
            if (!finished) {
                finished = true;
                done();
            }
        }

        window.setTimeout(go, 2500);

        if (!document.fonts || !document.fonts.load) {
            go();
            return;
        }

        Promise.all([
            document.fonts.load('italic 600 40px "Cormorant Garamond"'),
            document.fonts.load('500 16px "Cormorant Garamond"'),
            document.fonts.load('400 12px "Cinzel"'),
            document.fonts.load('400 40px "Great Vibes"')
        ]).then(go, go);
    }

    window.openInvite = function () {

        if (invitationOpening) {
            return;
        }

        invitationOpening = true;

        var opening = document.getElementById("opening");
        var envelope = document.querySelector(".simple-envelope");

        if (!opening) {
            return;
        }

        if (envelope) {
            envelope.classList.add("opening-clicked");
        }

        window.setTimeout(function () {
            opening.classList.add("hide");
        }, 450);

        window.setTimeout(function () {

            opening.style.display = "none";

            root.classList.add("show");
            document.body.classList.add("invite-open");
            window.scrollTo(0, 0);

            requestAnimationFrame(function () {

                root.classList.add("visible");
                started = true;

                scenes.forEach(function (scene) {
                    scene.inert = true;
                    scene.setAttribute("aria-hidden", "true");
                });

                /* let the paper settle before the first element */

                whenFontsReady(function () {
                    window.setTimeout(function () {
                        enter(0, false);
                    }, 400);
                });
            });

        }, 1100);
    };

    /* the envelope was mouse/touch only; make it keyboard-able */

    var envelopeEl = document.querySelector(".simple-envelope");

    if (envelopeEl) {
        envelopeEl.setAttribute("role", "button");
        envelopeEl.setAttribute("tabindex", "0");
        envelopeEl.setAttribute("aria-label", "Open the wedding invitation");

        envelopeEl.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.openInvite();
            }
        });
    }

    scenes.forEach(function (scene) {
        scene.inert = true;
        scene.setAttribute("aria-hidden", "true");
    });

    updateUI();

})();

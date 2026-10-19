/* =========================================================
   LOAD ALL SECTIONS
========================================================= */

async function loadSections() {

    try {

        const heroResponse =
            await fetch("hero.html");

        const journeyResponse =
            await fetch("journey.html");

        const locationResponse =
            await fetch("location.html");


        if (!heroResponse.ok) {
            throw new Error("Could not load hero.html");
        }

        if (!journeyResponse.ok) {
            throw new Error("Could not load journey.html");
        }

        if (!locationResponse.ok) {
            throw new Error("Could not load location.html");
        }


        const heroHTML =
            await heroResponse.text();

        const journeyHTML =
            await journeyResponse.text();

        const locationHTML =
            await locationResponse.text();


        const heroContainer =
            document.getElementById("heroContainer");

        const journeyContainer =
            document.getElementById("journeyContainer");

        const locationContainer =
            document.getElementById("locationContainer");


        heroContainer.innerHTML =
            heroHTML;

        journeyContainer.innerHTML =
            journeyHTML;

        locationContainer.innerHTML =
            locationHTML;


        /* Start everything only after HTML is loaded */

        initScratch();

        initCountdown();

        initScrollReveal();

    }

    catch (error) {

        console.error(
            "Error loading invitation:",
            error
        );

    }

}



/* =========================================================
   OPEN INVITATION
========================================================= */
let invitationOpening = false;


function openInvite() {

    const opening =
        document.getElementById("opening");

    const mainInvite =
        document.getElementById("mainInvite");

    const envelope =
        document.querySelector(".simple-envelope");


    if (!opening || !mainInvite) {
        return;
    }


    if (envelope) {
        envelope.classList.add(
            "opening-clicked"
        );
    }


    setTimeout(function () {

        opening.classList.add("hide");

    }, 450);


    setTimeout(function () {

        opening.style.display = "none";

        mainInvite.classList.add("show");

        document.body.classList.add(
            "invite-open"
        );

        window.scrollTo(0, 0);


        requestAnimationFrame(function () {

            mainInvite.classList.add(
                "visible"
            );


            if (
                typeof initScrollReveal ===
                "function"
            ) {
                initScrollReveal();
            }

        });

    }, 1100);
}
/* =========================================================
   SCRATCH CARD VARIABLES
========================================================= */

let scratchCanvas = null;

let scratchContext = null;

let scratching = false;

let lastX = 0;

let lastY = 0;

let scratchFinished = false;



/* =========================================================
   INITIALIZE SCRATCH
========================================================= */

function initScratch() {

    scratchCanvas =
        document.getElementById(
            "scratchCanvas"
        );


    if (!scratchCanvas) {

        console.log(
            "Scratch canvas not found"
        );

        return;

    }


    scratchContext =
        scratchCanvas.getContext(
            "2d"
        );


    /* POINTER DOWN */

    scratchCanvas.addEventListener(
        "pointerdown",
        startScratch
    );


    /* POINTER MOVE */

    scratchCanvas.addEventListener(
        "pointermove",
        moveScratch
    );


    /* POINTER UP */

    scratchCanvas.addEventListener(
        "pointerup",
        stopScratch
    );


    scratchCanvas.addEventListener(
        "pointercancel",
        stopScratch
    );


    scratchCanvas.addEventListener(
        "pointerleave",
        stopScratch
    );


    /*
       Initial drawing attempt.

       If mainInvite is hidden,
       openInvite() redraws it later.
    */

    setTimeout(function () {

        setupScratchCanvas();

    }, 100);

}



/* =========================================================
   DRAW SCRATCH COVER
========================================================= */

function setupScratchCanvas() {

    if (
        !scratchCanvas ||
        !scratchContext ||
        scratchFinished
    ) {
        return;
    }


    const rect =
        scratchCanvas
            .getBoundingClientRect();


    /*
       If card is currently hidden,
       wait until invitation opens.
    */

    if (
        rect.width === 0 ||
        rect.height === 0
    ) {

        return;

    }


    const dpr =
        window.devicePixelRatio || 1;


    scratchCanvas.width =
        Math.round(
            rect.width * dpr
        );


    scratchCanvas.height =
        Math.round(
            rect.height * dpr
        );


    scratchContext.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    scratchContext.globalCompositeOperation =
        "source-over";


    scratchContext.clearRect(
        0,
        0,
        rect.width,
        rect.height
    );



    /* =====================================================
       SCRATCH BACKGROUND
    ===================================================== */

    const gradient =
        scratchContext
            .createLinearGradient(
                0,
                0,
                rect.width,
                rect.height
            );


    gradient.addColorStop(
        0,
        "#8f5947"
    );


    gradient.addColorStop(
        0.45,
        "#c58b68"
    );


    gradient.addColorStop(
        1,
        "#8d5543"
    );


    scratchContext.fillStyle =
        gradient;


    scratchContext.fillRect(
        0,
        0,
        rect.width,
        rect.height
    );



    /* =====================================================
       INNER BORDER
    ===================================================== */

    scratchContext.strokeStyle =
        "rgba(255, 240, 214, 0.75)";


    scratchContext.lineWidth =
        1.5;


    scratchContext.strokeRect(
        11,
        11,
        rect.width - 22,
        rect.height - 22
    );



    /* =====================================================
       DECORATION
    ===================================================== */

    scratchContext.fillStyle =
        "#f8ead4";


    scratchContext.textAlign =
        "center";


    scratchContext.textBaseline =
        "middle";


    scratchContext.font =
        "15px Georgia";


    scratchContext.fillText(
        "✦",
        rect.width / 2,
        rect.height / 2 - 38
    );



    /* =====================================================
       SCRATCH TEXT
    ===================================================== */

    scratchContext.font =
        "italic 19px Georgia";


    scratchContext.fillText(
        "Scratch to reveal our date",
        rect.width / 2,
        rect.height / 2
    );


    scratchContext.font =
        "15px Georgia";


    scratchContext.fillText(
        "✦",
        rect.width / 2,
        rect.height / 2 + 38
    );

}



/* =========================================================
   GET POINTER POSITION
========================================================= */

function getScratchPosition(event) {

    const rect =
        scratchCanvas
            .getBoundingClientRect();


    return {

        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top

    };

}



/* =========================================================
   START SCRATCHING
========================================================= */

function startScratch(event) {

    if (scratchFinished) {
        return;
    }


    event.preventDefault();


    scratching =
        true;


    const position =
        getScratchPosition(
            event
        );


    lastX =
        position.x;


    lastY =
        position.y;


    try {

        scratchCanvas
            .setPointerCapture(
                event.pointerId
            );

    }

    catch (error) {

    }


    scratchLine(
        lastX,
        lastY,
        lastX + 1,
        lastY + 1
    );

}



/* =========================================================
   MOVE SCRATCH
========================================================= */

function moveScratch(event) {

    if (
        !scratching ||
        scratchFinished
    ) {
        return;
    }


    event.preventDefault();


    const position =
        getScratchPosition(
            event
        );


    scratchLine(
        lastX,
        lastY,
        position.x,
        position.y
    );


    lastX =
        position.x;


    lastY =
        position.y;

}



/* =========================================================
   DRAW SCRATCH LINE
========================================================= */

function scratchLine(
    x1,
    y1,
    x2,
    y2
) {

    if (!scratchContext) {
        return;
    }


    scratchContext
        .globalCompositeOperation =
        "destination-out";


    scratchContext.lineWidth =
        52;


    scratchContext.lineCap =
        "round";


    scratchContext.lineJoin =
        "round";


    scratchContext.beginPath();


    scratchContext.moveTo(
        x1,
        y1
    );


    scratchContext.lineTo(
        x2,
        y2
    );


    scratchContext.stroke();

}



/* =========================================================
   STOP SCRATCHING
========================================================= */

function stopScratch() {

    scratching =
        false;

}



/* =========================================================
   COUNTDOWN
========================================================= */

let countdownInterval = null;


function initCountdown() {

    const daysElement =
        document.getElementById(
            "days"
        );


    const hoursElement =
        document.getElementById(
            "hours"
        );


    const minutesElement =
        document.getElementById(
            "minutes"
        );


    const secondsElement =
        document.getElementById(
            "seconds"
        );


    if (
        !daysElement ||
        !hoursElement ||
        !minutesElement ||
        !secondsElement
    ) {

        console.log(
            "Countdown elements not found"
        );

        return;

    }



    /*
       =====================================================
       WEDDING DATE

       CHANGE THIS DATE LATER IF REQUIRED

       12 November 2026
       9:26 PM
       India Standard Time
       =====================================================
    */

    const weddingDate =
        new Date(
            "2026-11-12T21:26:00+05:30"
        );



    function updateCountdown() {

        const now =
            new Date();


        let difference =
            weddingDate.getTime() -
            now.getTime();



        /* =================================================
           WEDDING DAY REACHED
        ================================================= */

        if (difference <= 0) {

            daysElement.textContent =
                "00";


            hoursElement.textContent =
                "00";


            minutesElement.textContent =
                "00";


            secondsElement.textContent =
                "00";


            if (countdownInterval) {

                clearInterval(
                    countdownInterval
                );

            }


            return;

        }



        const second =
            1000;


        const minute =
            second * 60;


        const hour =
            minute * 60;


        const day =
            hour * 24;



        /* DAYS */

        const days =
            Math.floor(
                difference / day
            );


        difference =
            difference % day;



        /* HOURS */

        const hours =
            Math.floor(
                difference / hour
            );


        difference =
            difference % hour;



        /* MINUTES */

        const minutes =
            Math.floor(
                difference / minute
            );


        difference =
            difference % minute;



        /* SECONDS */

        const seconds =
            Math.floor(
                difference / second
            );



        /* =================================================
           DISPLAY
        ================================================= */

        daysElement.textContent =
            String(days)
                .padStart(
                    2,
                    "0"
                );


        hoursElement.textContent =
            String(hours)
                .padStart(
                    2,
                    "0"
                );


        minutesElement.textContent =
            String(minutes)
                .padStart(
                    2,
                    "0"
                );


        secondsElement.textContent =
            String(seconds)
                .padStart(
                    2,
                    "0"
                );

    }



    /* RUN IMMEDIATELY */

    updateCountdown();



    /* UPDATE EVERY SECOND */

    countdownInterval =
        setInterval(
            updateCountdown,
            1000
        );

}



/* =========================================================
   SCROLL REVEAL
========================================================= */

function initScrollReveal() {

    /*
       These elements animate individually.

       Journey heading
       Events
       Dotted connectors
       Journey ending
       Location heading
       Venue
       Map
       Location footer
    */

    const elements =
        document.querySelectorAll(
            ".pelli-reveal, .journey-title, .event, .connector, .journey-ending, .location-heading, .venue-details, .map-wrapper, .location-footer"
        );


    if (elements.length === 0) {

        console.log(
            "No scroll elements found"
        );

        return;

    }



    /* =====================================================
       FALLBACK FOR OLD BROWSERS
    ===================================================== */

    if (
        !("IntersectionObserver" in window)
    ) {

        elements.forEach(
            function (element) {

                element
                    .classList
                    .add(
                        "reveal"
                    );

            }
        );


        return;

    }



    /* =====================================================
       OBSERVER
    ===================================================== */

    const observer =
        new IntersectionObserver(

            function (entries) {

                entries.forEach(
                    function (entry) {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target
                                .classList
                                .add(
                                    "reveal"
                                );


                            /*
                               Animate once only.
                            */

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },

            {
                /*
                   Animation starts after
                   about 12% is visible.
                */

                threshold: 0.12,


                /*
                   Makes animation happen
                   slightly later while scrolling.
                */

                rootMargin:
                    "0px 0px -80px 0px"
            }

        );



    elements.forEach(
        function (element) {

            observer.observe(
                element
            );

        }
    );

}



/* =========================================================
   EXTRA PARALLAX EFFECT
   HERO DECORATIONS
========================================================= */

function initHeroParallax() {

    const parrot =
        document.querySelector(
            ".hero-parrot"
        );


    const banana =
        document.querySelector(
            ".hero-banana"
        );


    const lotus =
        document.querySelector(
            ".hero-lotus"
        );


    if (
        !parrot &&
        !banana &&
        !lotus
    ) {
        return;
    }


    window.addEventListener(
        "scroll",

        function () {

            const scroll =
                window.scrollY;


            /*
               Only apply near hero.
               Prevent unnecessary movement
               later in page.
            */

            if (scroll > 1100) {
                return;
            }


            if (parrot) {

                parrot.style.marginTop =
                    scroll * 0.04 +
                    "px";

            }


            if (banana) {

                banana.style.marginTop =
                    scroll * 0.025 +
                    "px";

            }


            if (lotus) {

                lotus.style.marginBottom =
                    scroll * 0.025 +
                    "px";

            }

        },

        {
            passive: true
        }

    );

}



/* =========================================================
   WINDOW RESIZE
========================================================= */

let resizeTimer;


window.addEventListener(
    "resize",

    function () {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                function () {

                    /*
                       Do not redraw once
                       user has scratched.
                    */

                    if (!scratchFinished) {

                        setupScratchCanvas();

                    }

                },

                250
            );

    }
);



/* =========================================================
   START WEBSITE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",

    function () {

        /*
           First load:
           hero.html
           journey.html
           location.html
        */

        loadSections()
            .then(
                function () {

                    initHeroParallax();

                }
            );

    }
);
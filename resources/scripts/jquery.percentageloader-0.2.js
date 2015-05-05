/*
jquery.percentageloader.js 
 
Copyright (c) 2015, David Jeffrey & Piotr Kwiatkowski
All rights reserved.

This jQuery plugin is licensed under the Simplified BSD License. Please
see the file license.txt that was included with the plugin bundle.

*/

(function() {
      "use strict";
    /*jslint browser: true */

    var imageLoaded = false;
    /* Our spiral gradient data */
    var imgdata = "data:image/png;base64,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",
        gradient = new Image();

    gradient.src = imgdata;
    gradient.addEventListener('load', function() {
       imageLoaded = true;
    });


    window.PercentageLoader = function(el, params) {
      var settings, canvas, percentageText, valueText, items, i, item, selectors, s, ctx, progress,
            value, cX, cY, lingrad, innerGrad, tubeGrad, innerRadius, innerBarRadius, outerBarRadius,
            radius, startAngle, endAngle, counterClockwise, completeAngle, setProgress, setValue,
            applyAngle, drawLoader, clipValue, outerDiv, ready, plugin;

        plugin = this;

        /* Specify default settings */
        settings = {
            width: 256,
            height: 256,
            progress: 0,
            value: '0kb',
            controllable: false
        };

        /* Override default settings with provided params, if any */
        if (params !== undefined) {
            var prop;
            for (prop in settings) {
                if (settings.hasOwnProperty(prop) && !params.hasOwnProperty(prop)) {
                    params[prop] = settings[prop];
                }
            }
        } else {
            params = settings;
        }

        outerDiv = document.createElement('div');
        outerDiv.style.width = settings.width + 'px';
        outerDiv.style.height = settings.height + 'px';
        outerDiv.style.position = 'relative';

        el.appendChild(outerDiv);

        /* Create our canvas object */
        canvas = document.createElement('canvas');
        canvas.setAttribute('width', settings.width);
        canvas.setAttribute('height', settings.height);
        outerDiv.appendChild(canvas);

        /* Create div elements we'll use for text. Drawing text is
         * possible with canvas but it is tricky working with custom
         * fonts as it is hard to guarantee when they become available
         * with differences between browsers. DOM is a safer bet here */
        percentageText = document.createElement('div');
        percentageText.style.width = (settings.width.toString() - 2) + 'px';
        percentageText.style.textAlign = 'center';
        percentageText.style.height = '50px';
        percentageText.style.left = 0;
        percentageText.style.position = 'absolute';
        percentageText.className = "percentage_text"

        valueText = document.createElement('div');
        valueText.style.width = (settings.width - 2).toString() + 'px';
        valueText.style.textAlign = 'center';
        valueText.style.height = '0px';
        valueText.style.overflow = 'hidden';
        valueText.style.left = 0;
        valueText.style.position = 'absolute';

        /* Force text items to not allow selection */
        items = [valueText, percentageText];
        for (i  = 0; i < items.length; i += 1) {
            item = items[i];
            selectors = [
                '-webkit-user-select',
                '-khtml-user-select',
                '-moz-user-select',
                '-o-user-select',
                'user-select'];

            for (s = 0; s < selectors.length; s += 1) {
                item.style[selectors[s]] = 'none';
            }
        }

        /* Add the new dom elements to the containing div */
        outerDiv.appendChild(percentageText);
        outerDiv.appendChild(valueText);

        /* Get a reference to the context of our canvas object */
        ctx = canvas.getContext("2d");


        /* Set various initial values */

        /* Centre point */
        cX = (canvas.width / 2) - 1;
        cY = (canvas.height / 2) - 1;

        /* Create our linear gradient for the outer ring */
        lingrad = ctx.createLinearGradient(cX, 0, cX, canvas.height);
        lingrad.addColorStop(0, '#d6eeff');
        lingrad.addColorStop(1, '#b6d8f0');

        /* Create inner gradient for the outer ring */
        innerGrad = ctx.createLinearGradient(cX, cX * 0.133333, cX, canvas.height - cX * 0.133333);
        innerGrad.addColorStop(0, '#f9fcfe');
        innerGrad.addColorStop(1, '#d9ebf7');

        /* Tube gradient (background, not the spiral gradient) */
        tubeGrad = ctx.createLinearGradient(cX, 0, cX, canvas.height);
        tubeGrad.addColorStop(0, '#c1dff4');
        tubeGrad.addColorStop(1, '#aacee6');

        /* The inner circle is 2/3rds the size of the outer one */
        innerRadius = cX * 0.6666;
        /* Outer radius is the same as the width / 2, same as the centre x
        * (but we leave a little room so the borders aren't truncated) */
        radius = cX - 2;

        /* Calculate the radii of the inner tube */
        innerBarRadius = innerRadius + (cX * 0.06);
        outerBarRadius = radius - (cX * 0.06);

        /* Bottom left angle */
        startAngle = 2.1707963267949;
        /* Bottom right angle */
        endAngle = 0.9707963267949 + (Math.PI * 2.0);

        /* Nicer to pass counterClockwise / clockwise into canvas functions
        * than true / false */
        counterClockwise = false;

        /* Borders should be 1px */
        ctx.lineWidth = 1;

        /**
         * Little helper method for transforming points on a given
         * angle and distance for code clarity
         */
        applyAngle = function (point, angle, distance) {
            return {
                x : point.x + (Math.cos(angle) * distance),
                y : point.y + (Math.sin(angle) * distance)
            };
        };


        /**
         * render the widget in its entirety.
         */
        drawLoader = function () {
            /* Clear canvas entirely */
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            /*** IMAGERY ***/

            /* draw outer circle */
            ctx.fillStyle = lingrad;
            ctx.beginPath();
            ctx.strokeStyle = '#b2d5ed';
            ctx.arc(cX, cY, radius, 0, Math.PI * 2, counterClockwise);
            ctx.fill();
            ctx.stroke();

            /* draw inner circle */
            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.arc(cX, cY, innerRadius, 0, Math.PI * 2, counterClockwise);
            ctx.fill();
            ctx.strokeStyle = '#b2d5edaa';
            ctx.stroke();

            ctx.beginPath();

            /**
             * Helper function - adds a path (without calls to beginPath or closePath)
             * to the context which describes the inner tube. We use this for drawing
             * the background of the inner tube (which is always at 100%) and the
             * progress meter itself, which may vary from 0-100% */
            function makeInnerTubePath(startAngle, endAngle) {
                var centrePoint, startPoint, controlAngle, capLength, c1, c2, point1, point2;
                centrePoint = {
                    x : cX,
                    y : cY
                };

                startPoint = applyAngle(centrePoint, startAngle, innerBarRadius);

                ctx.moveTo(startPoint.x, startPoint.y);

                point1 = applyAngle(centrePoint, endAngle, innerBarRadius);
                point2 = applyAngle(centrePoint, endAngle, outerBarRadius);

                controlAngle = endAngle + (3.142 / 2.0);
                /* Cap length - a fifth of the canvas size minus 4 pixels */
                capLength = (cX * 0.20) - 4;

                c1 = applyAngle(point1, controlAngle, capLength);
                c2 = applyAngle(point2, controlAngle, capLength);

                ctx.arc(cX, cY, innerBarRadius, startAngle, endAngle, false);
                ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point2.x, point2.y);
                ctx.arc(cX, cY, outerBarRadius, endAngle, startAngle, true);

                point1 = applyAngle(centrePoint, startAngle, innerBarRadius);
                point2 = applyAngle(centrePoint, startAngle, outerBarRadius);

                controlAngle = startAngle - (3.142 / 2.0);

                c1 = applyAngle(point2, controlAngle, capLength);
                c2 = applyAngle(point1, controlAngle, capLength);

                ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point1.x, point1.y);
            }

            /* Background tube */
            ctx.beginPath();
            ctx.strokeStyle = '#bcd4e5';
            makeInnerTubePath(startAngle, endAngle);

            ctx.fillStyle = tubeGrad;
            ctx.fill();
            ctx.stroke();

            /* Calculate angles for the the progress metre */
            completeAngle = startAngle + (progress * (endAngle - startAngle));

            ctx.beginPath();
            makeInnerTubePath(startAngle, completeAngle);

            /* We're going to apply a clip so save the current state */
            ctx.save();
            /* Clip so we can apply the image gradient */
            ctx.clip();

            /* Draw the spiral gradient over the clipped area */
            ctx.drawImage(gradient, 0, 0, canvas.width, canvas.height);

            /* Undo the clip */
            ctx.restore();

            /* Draw the outline of the path */
            ctx.beginPath();
            makeInnerTubePath(startAngle, completeAngle);
            ctx.stroke();

            /*** TEXT ***/
            (function () {
                var fontSize, string, smallSize, heightRemaining;
                /* Calculate the size of the font based on the canvas size */
                fontSize = cX / 2;

                percentageText.style.color = '#80a9c8';

                /* Calculate the text for the given percentage */
                string = (progress * 100.0).toFixed(0) + '%';

                percentageText.innerHTML = string;

                /* Calculate font and placement of small 'value' text */
                smallSize = cX / 5.5;
                valueText.style.color = '#80a9c8';
                valueText.style.font = smallSize.toString() + 'px BebasNeueRegular';
                valueText.style.height = smallSize.toString() + 'px';
                valueText.style.textShadow = 'None';

                /* Ugly vertical align calculations - fit into bottom ring.
                 * The bottom ring occupes 1/6 of the diameter of the circle */
                heightRemaining = (settings.height * 0.16666666) - smallSize;
                valueText.style.top = ((settings.height * 0.8333333) + (heightRemaining / 4)).toString() + 'px';
            }());
        };

        /**
        * Check the progress value and ensure it is within the correct bounds [0..1]
        */
        clipValue = function () {
            if (progress < 0) {
                progress = 0;
            }

            if (progress > 1.0) {
                progress = 1.0;
            }
        };

        /* Sets the current progress level of the loader
         *
         * @param value the progress value, from 0 to 1. Values outside this range
         * will be clipped
         */
        setProgress = function (value) {
            /* Clip values to the range [0..1] */
            progress = value;
            clipValue();
            drawLoader();
        };

        this.setProgress = setProgress;

        setValue = function (val) {
            value = val;
            valueText.innerHTML = value;
        };

        ready = function(fn) {
            if (imageLoaded) {
                fn();
            } else {
                gradient.addEventListener('load', fn);
            }
        };

        this.setValue = setValue;
        this.setValue(settings.value);

        this.loaded = ready;

        progress = settings.progress;
        clipValue();

        /* Do an initial draw */
        drawLoader();


        /* In controllable mode, add event handlers */
        if (params.controllable === true) {
            (function () {
                var mouseDown, getDistance, adjustProgressWithXY;
                getDistance = function (x, y) {
                    return Math.sqrt(Math.pow(x - cX, 2) + Math.pow(y - cY, 2));
                };

                mouseDown = false;

                adjustProgressWithXY = function (x, y) {
                    /* within the bar, calculate angle of touch point */
                    var pX, pY, angle, startTouchAngle, range, posValue;
                    pX = x - cX;
                    pY = y - cY;

                    angle = Math.atan2(pY, pX);
                    if (angle > Math.PI / 2.0) {
                        angle -= (Math.PI * 2.0);
                    }

                    startTouchAngle = startAngle - (Math.PI * 2.0);
                    range = endAngle - startAngle;
                    posValue = (angle - startTouchAngle) / range;
                    setProgress(posValue);

                    if (params.onProgressUpdate !== undefined) {
                        /* use the progress value as this will have been clipped
                         * to the correct range [0..1] after the call to setProgress
                         */
                        params.onProgressUpdate.call(plugin, progress);
                    }
                };

                outerDiv.addEventListener('mousedown', function (e) {
                    var offset, x, y, distance;
                    offset = this.getBoundingClientRect();
                    x = e.pageX - offset.left;
                    y = e.pageY - offset.top;

                    distance = getDistance(x, y);

                    if (distance > innerRadius && distance < radius) {
                        mouseDown = true;
                        adjustProgressWithXY(x, y);
                    }
                });

                outerDiv.addEventListener('mouseup', function () {
                    mouseDown = false;
                });

                outerDiv.addEventListener('mousemove', function (e) {
                    var offset, x, y;
                    if (mouseDown) {
                        offset = this.getBoundingClientRect();
                        x = e.pageX - offset.left;
                        y = e.pageY - offset.top;
                        adjustProgressWithXY(x, y);
                    }
                });

                outerDiv.addEventListener('mouseleave', function (e) {
                    mouseDown = false;
                });
            }());
        }

        return this;
    }
})();

// If jQuery is available, define this as a jQuery plugin
if (typeof jQuery !== 'undefined') {
    /*global jQuery */
    (function ($) {
        /* Strict mode for this plugin */

        /** Percentage loader
         * @param    params    Specify options in {}. May be on of width, height, progress or value.
         *
         * @example $("#myloader-container).percentageLoader({
                width : 256,  // width in pixels
                height : 256, // height in pixels
                progress: 0,  // initialise progress bar position, within the range [0..1]
                value: '0kb'  // initialise text label to this value
            });
         */
        $.fn.percentageLoader = function (params) {
            return this.each(function () {
                if (!$.data(this, 'dj_percentageloader')) {
                    $.data(this, 'dj_percentageloader', new PercentageLoader(this, params));
                } else {
                    var plugin = $.data(this, 'dj_percentageloader');
                    if (params['value'] !== undefined) {
                        plugin.setValue(params['value']);
                    }

                    if (params['progress'] !== undefined) {
                        plugin.setProgress(params['progress']);
                    }

                    if (params['onready'] !== undefined) {
                        plugin.loaded(params['onready']);
                    }
                }
            });
        };
    }(jQuery));
}

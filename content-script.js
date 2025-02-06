/*******************************************************
 * content-script.js
 * (Include jQuery in your extension and load it before this script)
 *******************************************************/
(function () {
    'use strict';

    $(document).ready(function () {

        /**
         * Modify a single swimlane wrapper:
         * - Remove "create issue" containers,
         * - Subtract total container height from min-height & top
         */
        function modifySwimlaneWrapper($swimlane) {
            try {
                // Prevent re-processing
                if ($swimlane.data('ws-swimlane-processed') === true) {
                    return;
                }
                $swimlane.data('ws-swimlane-processed', true);

                let totalHeightRemoved = 0;

                /*********************************************************
                 * 1) Find each container with data-testid
                 *    "platform-inline-card-create.ui.container"
                 *    (the block that holds the "Create issue" button)
                 *********************************************************/
                const $createContainers = $swimlane.find('[data-testid="platform-inline-card-create.ui.container"]');

                $createContainers.each(function () {
                    const $container = $(this);
                    // Measure its height (including margin)
                    const containerHeight = $container.outerHeight(true);
                    totalHeightRemoved += containerHeight;
                    // Remove it
                    $container.remove();
                });

                if (totalHeightRemoved > 0) {
                    /*********************************************************
                     * 2) Adjust the swimlane wrapper's min-height & top
                     *********************************************************/

                        // Parse existing min-height
                    let oldMinHeight = parseInt($swimlane.css('min-height'), 10);
                    if (isNaN(oldMinHeight)) {
                        oldMinHeight = 0;
                    }
                    const newMinHeight = Math.max(0, oldMinHeight - totalHeightRemoved);
                    $swimlane.css('min-height', newMinHeight + 'px');

                    // Parse existing top
                    let oldTop = parseInt($swimlane.css('top'), 10);
                    if (isNaN(oldTop)) {
                        oldTop = 0;
                    }
                    const newTop = Math.max(0, oldTop - totalHeightRemoved);
                    $swimlane.css('top', newTop + 'px');
                }

                console.log('[Swimlane] Modified:', $swimlane);
            } catch (err) {
                console.error('[Swimlane] Error modifying:', err);
            }
        }

        /**
         * Use a MutationObserver to catch newly added or changed
         * swimlane wrappers in real-time.
         */
        function onDomMutation(mutationsList) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) return;

                        // If the node itself is a swimlane wrapper
                        if (
                            node.hasAttribute &&
                            node.hasAttribute('data-testid') &&
                            node.getAttribute('data-testid') === 'platform-board-kit.ui.swimlane.swimlane-wrapper'
                        ) {
                            modifySwimlaneWrapper($(node));
                        }

                        // If the node contains any swimlane wrappers
                        const $wrappers = $(node).find('[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]');
                        if ($wrappers.length > 0) {
                            $wrappers.each(function () {
                                modifySwimlaneWrapper($(this));
                            });
                        }
                    });
                }
                else if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof HTMLElement) {
                        if (
                            target.hasAttribute('data-testid') &&
                            target.getAttribute('data-testid') === 'platform-board-kit.ui.swimlane.swimlane-wrapper'
                        ) {
                            modifySwimlaneWrapper($(target));
                        }
                    }
                }
            }
        }

        // Create and start the observer
        const observer = new MutationObserver(onDomMutation);
        observer.observe(document.body, {
            childList: true,
            attributes: true,
            subtree: true
        });

        // Immediately handle any existing swimlane wrappers on page load
        $('[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]').each(function () {
            modifySwimlaneWrapper($(this));
        });

        console.log('[Swimlane] Observer is running...');
    });
})();

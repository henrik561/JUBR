function adjustContainerHeights() {
    const buttons = document.querySelectorAll('button[data-testid="platform-inline-card-create.ui.trigger.visible.button"]');

    buttons.forEach(button => {
        const removableParent = button.closest('li');

        if (removableParent) {
            const targetContainer = removableParent.closest('[data-testid="software-board.board-container.board.virtual-board.fast-virtual-list.fast-virtual-list-wrapper"]');

            if (targetContainer) {
                const removableHeight = removableParent.offsetHeight;
                const currentContainerHeight = targetContainer.offsetHeight;
                const newContainerHeight = currentContainerHeight - removableHeight;

                removableParent.remove();
                targetContainer.style.minHeight = `${newContainerHeight}px`;
            }
        }
    });
}

function initializeObservers() {
    const swimlanes = document.querySelectorAll('[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]');

    swimlanes.forEach(swimlane => {
        const targetButton = swimlane.querySelector('[data-testid="platform-board-kit.ui.swimlane.swimlane-content"]');

        if (targetButton) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'aria-expanded') {
                        const isExpanded = targetButton.getAttribute('aria-expanded') === 'true';

                        if (isExpanded) {
                            const buttonToRemove = swimlane.querySelector('[data-testid="platform-inline-card-create.ui.trigger.visible.button"]');
                            if (buttonToRemove) {
                                buttonToRemove.remove();
                            }
                        }
                    }
                });
            });

            observer.observe(targetButton, { attributes: true });
        }
    });
}

initializeObservers();
adjustContainerHeights();



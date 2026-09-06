// =====================================
// HELP & SUPPORT MODULE
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    initializeHelp
);


// =====================================
// INITIALIZE
// =====================================

function initializeHelp() {

    initializeFaq();

    initializeSearch();

    initializeTopicButtons();

    updateSystemStatus();

}


// =====================================
// FAQ ACCORDION
// =====================================

function initializeFaq() {

    document
        .querySelectorAll(".faq-question")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const faqItem =
                        button.closest(
                            ".faq-item"
                        );

                    if (!faqItem) {
                        return;
                    }


                    const wasOpen =
                        faqItem.classList.contains(
                            "open"
                        );


                    // Close other FAQ items

                    document
                        .querySelectorAll(
                            ".faq-item.open"
                        )
                        .forEach(item => {

                            item.classList.remove(
                                "open"
                            );

                        });


                    // Toggle selected item

                    if (!wasOpen) {

                        faqItem.classList.add(
                            "open"
                        );

                    }

                }
            );

        });

}


// =====================================
// SEARCH
// =====================================

function initializeSearch() {

    const searchInput =
        document.getElementById(
            "helpSearch"
        );

    const clearButton =
        document.getElementById(
            "clearSearch"
        );

    const noResults =
        document.getElementById(
            "noFaqResults"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (clearButton) {

                clearButton.classList.toggle(
                    "show",
                    query.length > 0
                );

            }


            const faqItems =
                document.querySelectorAll(
                    ".faq-item"
                );


            let visibleCount = 0;


            faqItems.forEach(item => {

                const searchText =
                    (
                        item.dataset.search ||
                        item.textContent
                    ).toLowerCase();


                const matches =
                    !query ||
                    searchText.includes(
                        query
                    );


                item.classList.toggle(
                    "search-hidden",
                    !matches
                );


                if (matches) {
                    visibleCount++;
                }

            });


            if (noResults) {

                noResults.classList.toggle(
                    "show",
                    visibleCount === 0
                );

            }

        }
    );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                searchInput.value = "";

                searchInput.dispatchEvent(
                    new Event("input")
                );

                searchInput.focus();

            }
        );

    }

}


// =====================================
// TOPIC BUTTONS
// =====================================

function initializeTopicButtons() {

    document
        .querySelectorAll(
            ".topic-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const targetId =
                        button.dataset.target;

                    const target =
                        document.getElementById(
                            targetId
                        );


                    if (!target) {
                        return;
                    }


                    // Scroll to FAQ

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });


                    // Open FAQ

                    document
                        .querySelectorAll(
                            ".faq-item.open"
                        )
                        .forEach(item => {

                            item.classList.remove(
                                "open"
                            );

                        });


                    target.classList.add(
                        "open"
                    );

                }
            );

        });

}


// =====================================
// SYSTEM STATUS
// =====================================

function updateSystemStatus() {

    const statusTime =
        document.getElementById(
            "statusCheckedAt"
        );

    const statusText =
        document.getElementById(
            "systemStatusText"
        );


    if (statusTime) {

        statusTime.textContent =
            formatCurrentTime();

    }


    if (statusText) {

        statusText.textContent =
            "Application services are available.";

    }

}


// =====================================
// FORMAT CURRENT TIME
// =====================================

function formatCurrentTime() {

    const now =
        new Date();


    return now.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}
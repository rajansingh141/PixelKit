// =========================================
// 1. SEARCH BAR FUNCTIONALITY
// =========================================

// Find the search input and all the tool cards on the page
const searchInput = document.getElementById('tool-search');
const toolCards = document.querySelectorAll('.tool-card');

// Listen for every keystroke in the search bar
searchInput.addEventListener('input', function() {
    // Get what the user typed, and make it all lowercase so it's easier to match
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Look at each tool card one by one
    toolCards.forEach(function(card) {
        // Get all the text inside the card (the title and the description)
        const cardText = card.innerText.toLowerCase();

        // If the text in the card includes the word the user typed...
        if (cardText.includes(searchTerm)) {
            card.style.display = 'block'; // ...show the card!
        } else {
            card.style.display = 'none';  // ...otherwise, hide it.
        }
    });
});

// =========================================
// 2. TOOL CARD CLICKS (COMING SOON)
// =========================================

// Since the actual tools aren't built yet, we want to let the user know.
// We will add a click event to every tool card.
toolCards.forEach(function(card) {
    card.addEventListener('click', function(event) {
        // If this is a completed tool, let the browser follow the link normally
        const completedTools = ['compressor', 'resizer', 'converter', 'pdf', 'cropper', 'target-compressor'];
        if (completedTools.includes(card.dataset.tool)) {
            return; // Do nothing else — the link will work
        }

        // For all other tools, stop the link and show "coming soon"
        event.preventDefault(); 
        alert("This tool is coming soon! We are still building it. Check back later.");
    });
});
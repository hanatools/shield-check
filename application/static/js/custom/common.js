// Handle submenu toggle on click
document.querySelectorAll('.main-button').forEach(button => {
    button.addEventListener('click', function (e) {
        e.preventDefault();

        // Get the submenu to toggle
        const targetSubmenu = document.querySelector(this.getAttribute('data-target'));

        // Toggle the submenu
        if (targetSubmenu.style.display === 'block') {
            targetSubmenu.style.display = 'none';
        } else {
            // Close any open submenu
            document.querySelectorAll('.submenu').forEach(sub => sub.style.display = 'none');
            // Open the clicked submenu
            targetSubmenu.style.display = 'block';
        }
    });
});
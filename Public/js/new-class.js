document.addEventListener('DOMContentLoaded', async function() {
    // Load teacher profile
    async function loadUserProfile() {
        try {
            const response = await fetch('/teacher/current-user', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to load user data');
            const user = await response.json();
            
            document.getElementById('teacherName').textContent = user.name;
            const initialsEl = document.getElementById('teacherInitials');
            if (initialsEl) {
                initialsEl.textContent = user.initials;
                initialsEl.className = 'avatar'; // Ensure CSS class is applied
            }
        } catch (error) {
            console.error('User load error:', error);
            document.getElementById('teacherName').textContent = 'Teacher';
        }
    }

    await loadUserProfile();

    // Load user data first
    await loadUserProfile();

    // Form submission handler
    document.getElementById('newClassForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('className').value,
            code: document.getElementById('classCode').value,
            schedule: document.getElementById('classSchedule').value
        };

        try {
            const response = await fetch('/teacher/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create class');
            }

            window.location.href = '/teacher/classes';
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });
});
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verify session
        const sessionRes = await fetch('/session', {
            credentials: 'include'
        });
        if (!sessionRes.ok) throw new Error('Not authenticated');
        
        const { user } = await sessionRes.json();
        if (user.role !== 'teacher') {
            window.location.href = '/';
            return;
        }

        // Set user info
        document.getElementById('teacherName').textContent = user.name;
        document.getElementById('teacherInitials').textContent = 
            user.name.split(' ').map(n => n[0]).join('').toUpperCase();

        // Load class data for editing
        const pathParts = window.location.pathname.split('/');
        const classId = pathParts[pathParts.length - 2]; // More reliable way to get ID
        
        if (!classId || isNaN(classId)) {
            throw new Error('Invalid class ID');
        }

        await loadClassData(classId);
        
    } catch (error) {
        console.error('Edit page initialization error:', error);
        alert('Failed to initialize edit page. Redirecting...');
        window.location.href = '/teacher/classes';
    }
});

async function loadClassData(classId) {
    try {
        const response = await fetch(`/teacher/classes/${classId}/data`, {
            credentials: 'include' // Important for session
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load class data');
        }

        const data = await response.json();
        
        // Debugging: log the full response
        console.log('API Response:', data);
        
        // Handle different response structures
        const classData = data.class || data.data?.class || data;
        
        if (!classData || !classData.name) {
            throw new Error('Invalid class data structure');
        }

        document.getElementById('className').value = classData.name;
        document.getElementById('classCode').value = classData.code;
        document.getElementById('classSchedule').value = classData.schedule || '';
        
    } catch (error) {
        console.error('Error loading class data:', error);
        alert(`Error: ${error.message}\nRedirecting to classes list...`);
        window.location.href = '/teacher/classes';
    }
}

document.getElementById('editClassForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const classId = window.location.pathname.split('/')[3]; // /teacher/classes/:id/edit

    const updatedData = {
        name: document.getElementById('className').value.trim(),
        code: document.getElementById('classCode').value.trim(),
        schedule: document.getElementById('classSchedule').value.trim()
    };

    try {
        const res = await fetch(`/teacher/classes/${classId}`, {
            method: 'PUT', 
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updatedData)
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.error || 'Update failed');
        }
showToast('Class updated successfully');
setTimeout(() => {
    window.location.href = `/teacher/classes/${classId}`;
}, 1500);


    } catch (error) {
        console.error('Save failed:', error);
        alert('Failed to save changes: ' + error.message);
    }
});

function showToast(message, isSuccess = true) {
    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // Update toast text
    toastMessage.textContent = message;

    // Update toast color
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(isSuccess ? 'bg-success' : 'bg-danger');

    // Bootstrap Toast instance
    const bsToast = new bootstrap.Toast(toastEl);
    bsToast.show();
}

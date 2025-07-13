document.addEventListener('DOMContentLoaded', async function() {
        try {
            // Load teacher name
           const sessionRes = await fetch('/session', {
            credentials: 'include'
        });
            const { user } = await sessionRes.json();
            document.getElementById('teacherName').textContent = user.name;
            document.getElementById('teacherInitials').textContent = 
                user.name.split(' ').map(n => n[0]).join('').toUpperCase();

            // Load classes
            const response = await fetch('/teacher/dashboard/data');
            const data = await response.json();
            
            renderClasses(data.classes);
            
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('classesContainer').innerHTML = `
                <div class="alert alert-danger">
                    Failed to load classes. <a href="javascript:location.reload()">Try again</a>
                </div>
            `;
        }
    });

    function renderClasses(classes) {
        const container = document.getElementById('classesContainer');
        
        if (!classes || classes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    No classes found. <a href="/teacher/classes/new">Create a class</a> first.
                </div>
            `;
            return;
        }

        container.innerHTML = classes.map(cls => `
            <div class="class-card card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4>${cls.name}</h4>
                            <p class="mb-1">${cls.code} • ${cls.schedule}</p>
                            <small>${cls.student_count || 0} students</small>
                        </div>
                        <a href="/teacher/attendance/${cls.id}" class="btn btn-primary">
                            <i class="fas fa-clipboard-check"></i> Take Attendance
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
       const response = await fetch('/auth/logout', {
  method: 'POST',
  credentials: 'include'
});

        
        if (response.ok) {
            window.location.href = '/';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
});
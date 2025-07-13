document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set active nav item
        document.querySelector('[data-section="classes"]').classList.add('active');
        
        // Load user data
        const sessionRes = await fetch('/session', {
            credentials: 'include'
        });
        
        if (!sessionRes.ok) {
            window.location.href = '/login';
            return;
        }
        
        const { user } = await sessionRes.json();
        if (!user) throw new Error('No user data');
        
        document.getElementById('teacherName').textContent = 
            user.full_name || user.username || 'Teacher';
        document.getElementById('teacherInitials').textContent = 
            user.initials || (user.username?.[0] || 'T').toUpperCase();

        // Load classes data
        const response = await fetch('/teacher/classes/data', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load classes');
        
        const { data } = await response.json();
        renderClasses(data);
        setupEventListeners();
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load classes', 'error');
        renderErrorState();
    }
});

function renderClasses(classes) {
    const container = document.getElementById('classesContainer');
    
    if (!classes || classes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chalkboard-teacher"></i>
                <h4>No Classes Found</h4>
                <p>You haven't created any classes yet. Get started by creating your first class.</p>
                <a href="/teacher/classes/new" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Create Class
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = classes.map(cls => `
        <div class="class-card">
            <div class="class-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h4>${cls.name}</h4>
                    <span class="badge bg-light text-dark">${cls.code}</span>
                </div>
                <p class="mb-0"><i class="fas fa-calendar-alt me-2"></i>${cls.schedule}</p>
            </div>
            <div class="class-body">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge-enrolled">
                        <i class="fas fa-users me-1"></i> 
                        ${cls.student_count || 0} Students
                    </span>
                    <div class="action-btns">
                        <a href="/teacher/classes/${cls.id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-eye"></i> View
                        </a>
                        <a href="/teacher/attendance/${cls.id}" class="btn btn-sm btn-success">
                            <i class="fas fa-clipboard-check"></i> Attendance
                        </a>
                        <a href="/teacher/classes/${cls.id}/edit" class="btn btn-sm btn-warning">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderErrorState() {
    const container = document.getElementById('classesContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle text-danger"></i>
            <h4>Error Loading Classes</h4>
            <p>We couldn't load your classes. Please try again later.</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
}

function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.class-card');
        
        let hasMatches = false;
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                card.style.display = '';
                hasMatches = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        const emptyState = document.querySelector('.empty-state');
        if (emptyState) {
            emptyState.style.display = hasMatches ? 'none' : 'block';
        }
    });
}

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.ok) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
});

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    toast.style.backgroundColor = 
        type === 'error' ? '#dc3545' :
        type === 'success' ? '#28a745' : '#17a2b8';
    
    setTimeout(() => { toast.className = 'toast'; }, 3000);
}
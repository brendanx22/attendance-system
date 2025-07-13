// public/js/students.js
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set active nav item
        document.querySelector('[data-section="students"]').classList.add('active');
        
        // Load teacher name
       const sessionRes = await fetch('/session', {
            credentials: 'include'
        });
        if (!sessionRes.ok) throw new Error('Session error');
        const { user } = await sessionRes.json();
        document.getElementById('teacherName').textContent = user.name;
        document.getElementById('teacherInitials').textContent = 
            user.name.split(' ').map(n => n[0]).join('').toUpperCase();

        // Show loading state
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        // Load students data
        const response = await fetch('/teacher/students/data');
        if (!response.ok) throw new Error('Failed to load students');
        const students = await response.json();
        
        renderStudentsTable(students);
        setupSearch();
        setupEventListeners();
        
    } catch (error) {
        console.error('Error:', error);
        renderErrorState(error.message);
    }
});

function renderStudentsTable(students) {
    const tbody = document.querySelector('tbody');
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    No students found in your classes
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.id}</td>
            <td>${student.first_name} ${student.last_name}</td>
            <td>${student.email || 'N/A'}</td>
            <td>${student.class_names?.join(', ') || 'Not enrolled'}</td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar" 
                         role="progressbar" 
                         style="width: ${student.attendance_rate || 0}%" 
                         aria-valuenow="${student.attendance_rate || 0}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${student.attendance_rate || 0}%
                    </div>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary view-student" data-id="${student.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function setupSearch() {
    const searchInput = document.querySelector('.card-header input[type="text"]');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

function setupEventListeners() {
    // View student buttons
    document.querySelectorAll('.view-student').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.getAttribute('data-id');
            window.location.href = `/teacher/student/${studentId}`;
        });
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/auth/logout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    });
}

function renderErrorState(message) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger py-4">
                ${message || 'Failed to load students'}. <a href="javascript:location.reload()">Try again</a>
            </td>
        </tr>
    `;
}

function showToast(message, type = 'info') {
    // Use existing toast implementation from teacher-dashboard.js
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    toast.style.backgroundColor = 
        type === 'error' ? '#dc3545' :
        type === 'success' ? '#28a745' : '#17a2b8';
    
    setTimeout(() => { toast.className = 'toast'; }, 3000);
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set active nav item
        document.querySelector('[data-section="students"]').classList.add('active');
        
        // Load teacher name
        const sessionRes = await fetch('/session', {
            credentials: 'include'
        });
        if (!sessionRes.ok) throw new Error('Session error');
        const { user } = await sessionRes.json();
        document.getElementById('teacherName').textContent = user.name;
        document.getElementById('teacherInitials').textContent = 
            user.name.split(' ').map(n => n[0]).join('').toUpperCase();

        // Load students data
        const response = await fetch('/teacher/students/data');
        if (!response.ok) throw new Error('Failed to load students');
        const students = await response.json();
        
        renderStudentsTable(students);
        setupSearch();
        
    } catch (error) {
        console.error('Error:', error);
        renderErrorState();
    }
});

function renderStudentsTable(students) {
    const tbody = document.querySelector('tbody');
    
    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    No students found in your classes
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.id}</td>
            <td>${student.first_name} ${student.last_name}</td>
            <td>${student.email || 'N/A'}</td>
            <td>${student.class_names.join(', ') || 'Not enrolled'}</td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar" 
                         role="progressbar" 
                         style="width: ${student.attendance_rate}%" 
                         aria-valuenow="${student.attendance_rate}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${student.attendance_rate}%
                    </div>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function setupSearch() {
    const searchInput = document.querySelector('#searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

function renderErrorState() {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger py-4">
                Failed to load students. <a href="javascript:location.reload()">Try again</a>
            </td>
        </tr>
    `;
}
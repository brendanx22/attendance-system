document.addEventListener('DOMContentLoaded', async function () {
    if (window.location.pathname.includes('/edit')) return;

    try {
        // First verify session and user role
        const sessionRes = await fetch('/session', {
            credentials: 'include'
        });

        if (!sessionRes.ok) {
            window.location.href = '/login';
            return;
        }

        const { user } = await sessionRes.json();
        if (!user || user.role !== 'teacher') {
            window.location.href = '/';
            return;
        }

        // Set user info in the UI
        document.getElementById('teacherName').textContent = 
            user.full_name || 'Teacher';
        document.getElementById('teacherInitials').textContent = 
            user.initials || 'T';

        // Set active nav item based on current page
        const currentPage = window.location.pathname.split('/')[2] || 'dashboard';
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === currentPage) {
                link.classList.add('active');
            }
        });

        // Load dashboard data
        await loadDashboardData();
        setupEventListeners();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('Failed to initialize dashboard', 'error');
        window.location.href = '/login';
    }
});

async function loadDashboardData() {
    try {
        // Show loading states
        document.querySelectorAll('.stat-card .card-text').forEach(el => {
            el.classList.add('loading');
        });

        document.getElementById('classesTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        // Fetch dashboard data
        const response = await fetch('/teacher/dashboard/data', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to load dashboard data: ${response.status}`);
        }

        const { data } = await response.json();
        if (!data) throw new Error('No data received');

        // Update stats
        document.getElementById('totalClassesStat').textContent = data.classes?.length || 0;
        document.getElementById('presentTodayStat').textContent = data.attendanceSummary?.present || 0;
        document.getElementById('absentTodayStat').textContent = data.attendanceSummary?.absent || 0;

        populateClassesTable(data.classes || []);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');

        document.getElementById('classesTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load classes. Please try again.
                </td>
            </tr>
        `;
    } finally {
        document.querySelectorAll('.stat-card .card-text').forEach(el => {
            el.classList.remove('loading');
        });
    }
}

function populateClassesTable(classes) {
    const tableBody = document.getElementById('classesTableBody');

    if (!classes || classes.length === 0) {
        document.getElementById('noClassesMessage').style.display = 'block';
        document.getElementById('classesTable').style.display = 'none';
        return;
    }

    document.getElementById('noClassesMessage').style.display = 'none';
    document.getElementById('classesTable').style.display = 'table';

    tableBody.innerHTML = classes.map(cls => `
        <tr>
            <td>${cls.name || 'Unnamed Class'}</td>
            <td>${cls.code || 'N/A'}</td>
            <td>${cls.schedule || 'Not scheduled'}</td>
            <td>${cls.student_count || 0}</td>
            <td>
                <a href="/teacher/classes/${cls.id}" class="btn btn-sm btn-primary">
                    <i class="fas fa-eye"></i> View
                </a>
                <a href="/teacher/attendance/${cls.id}" class="btn btn-sm btn-success">
                    <i class="fas fa-clipboard-check"></i> Attendance
                </a>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
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
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#classesTableBody tr');

    let hasMatches = false;

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
            hasMatches = true;
        } else {
            row.style.display = 'none';
        }
    });

    if (!hasMatches && searchTerm.length > 0) {
        document.getElementById('noClassesMessage').textContent = 'No classes match your search';
        document.getElementById('noClassesMessage').style.display = 'block';
    } else {
        document.getElementById('noClassesMessage').style.display = 'none';
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast show';

    switch (type) {
        case 'error': 
            toast.style.backgroundColor = '#dc3545'; 
            break;
        case 'success': 
            toast.style.backgroundColor = '#28a745'; 
            break;
        case 'warning': 
            toast.style.backgroundColor = '#ffc107'; 
            break;
        default: 
            toast.style.backgroundColor = '#17a2b8';
    }

    setTimeout(() => { toast.className = 'toast'; }, 3000);
}
document.addEventListener('DOMContentLoaded', async function () {
    // DOM Elements
    const container = document.querySelector('.content-section') || document.body;
    let lastError = '';
    let apiResponse = null;

    // Helper Functions
    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const getInitials = (student) => {
        return `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
    };

    // ✅ Load teacher profile from dashboard data
   async function loadUserProfileFromDashboardData() {
    try {
        const res = await fetch('/teacher/dashboard/data', { credentials: 'include' });
        const data = await res.json();
        const { user } = data;

        const nameEl = document.getElementById('teacherName');

        const initials = user.initials || (
            user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
        );

        const initialsEl = document.getElementById('teacherInitials');
        if (initialsEl) {
            initialsEl.textContent = initials;
            initialsEl.style.display = 'flex';
            initialsEl.style.alignItems = 'center';
            initialsEl.style.justifyContent = 'center';
            initialsEl.style.backgroundColor = '#4f46e5';
            initialsEl.style.color = 'white';
            initialsEl.style.borderRadius = '50%';
            initialsEl.style.width = '36px';
            initialsEl.style.height = '36px';
            initialsEl.style.fontWeight = 'bold';
        }

        if (nameEl) nameEl.textContent = user.name;

    } catch (err) {
        console.error('User profile load failed', err);
    }
}

    // UI Templates
    const templates = {
        loading: `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading class information...</p>
            </div>
        `,
        error: (message, details, showReload) => `
            <div class="error-card">
                <div class="error-header">
                    <i class="icon-warning"></i>
                    <h3>${escapeHtml(message)}</h3>
                </div>
                ${details ? `<p class="error-details">${escapeHtml(details)}</p>` : ''}
                <div class="error-actions">
                    ${showReload ? `<button id="reloadBtn" class="btn">Try Again</button>` : ''}
                    <a href="/teacher/classes" class="btn outline">Back to Classes</a>
                    <button id="debugBtn" class="btn text">Debug Info</button>
                </div>
                <div id="debugInfo" class="debug-info"></div>
            </div>
        `,
        classDetail: (classInfo, students, stats) => `
            <div class="class-detail-card">
                <header class="class-header">
                    <h2>${escapeHtml(classInfo.name)}</h2>
                    <span class="class-code">${escapeHtml(classInfo.code)}</span>
                </header>

                <div class="class-meta">
                    <div class="meta-item">
                        <i class="icon-calendar"></i>
                        <span>${escapeHtml(classInfo.schedule || 'Schedule not set')}</span>
                    </div>
                    <div class="meta-item">
                        <i class="icon-clock"></i>
                        <span>${escapeHtml(stats.nextSession)}</span>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalStudents}</div>
                        <div class="stat-label">Students</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.attendanceRate}%</div>
                        <div class="stat-label">Attendance</div>
                    </div>
                </div>

                <div class="students-section">
                    <h3>Student Roster</h3>
                    ${students.length > 0 ? `
                        <div class="student-list">
                            ${students.map(student => `
                                <div class="student-item">
                                    <div class="student-avatar">${getInitials(student)}</div>
                                    <div class="student-info">
                                        <div class="student-name">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</div>
                                        <div class="student-email">${escapeHtml(student.email)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="icon-users"></i>
                            <p>No students enrolled</p>
                        </div>
                    `}
                </div>
            </div>
        `
    };

    // Utility functions
    const showLoading = () => {
        container.innerHTML = templates.loading;
        container.className = 'loading-state';
    };

    const validateClassId = (classId) => {
        if (!classId || !/^\d+$/.test(classId)) {
            throw new Error('Invalid class ID');
        }
        return classId;
    };

    const fetchClassData = async (classId) => {
        try {
            const response = await fetch(`/teacher/classes/${classId}/data`, {
                credentials: 'include'
            });

            apiResponse = {
                status: response.status,
                ok: response.ok,
                body: await response.text()
            };

            if (!response.ok) {
                throw new Error(apiResponse.statusText || 'Request failed');
            }

            const result = JSON.parse(apiResponse.body);
            const data = result.data || result;

            if (!data.class) {
                throw new Error('Class information not found in response');
            }

            return {
                class: data.class,
                students: data.students || [],
                stats: data.stats || {
                    totalStudents: data.students?.length || 0,
                    attendanceRate: 0,
                    nextSession: 'Not scheduled'
                }
            };

        } catch (error) {
            console.error('Fetch error:', error);
            lastError = error.message;
            throw error;
        }
    };

    const renderClassData = (classData) => {
        container.innerHTML = templates.classDetail(
            classData.class,
            classData.students,
            classData.stats
        );
        container.className = 'loaded-state';
    };

    // Edit button handler (if present)
    document.getElementById('editClassBtn')?.addEventListener('click', () => {
        const classId = window.location.pathname.split('/').pop();
        window.location.href = `/teacher/classes/${classId}/edit`;
    });

    // 🚀 Main Execution
    try {
        await loadUserProfileFromDashboardData(); // ✅ FIXED function call
        showLoading();

        const classId = validateClassId(window.location.pathname.split('/').pop());
        const classData = await fetchClassData(classId);
        renderClassData(classData);
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = templates.error(
            'Failed to load class',
            error.message,
            !error.message.includes('Invalid class ID')
        );
        container.className = 'error-state';
    }
});

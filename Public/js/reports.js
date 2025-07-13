document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Set active nav item
        document.querySelector('[data-section="reports"]').classList.add('active');
        
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
        document.getElementById('attendanceChart').parentElement.innerHTML = 
            '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
        document.getElementById('performanceChart').parentElement.innerHTML = 
            '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';

        // Load reports data
        const response = await fetch('/teacher/reports/data');
        if (!response.ok) throw new Error('Failed to load reports');
        const reportData = await response.json();
        
        renderCharts(reportData);
        
    } catch (error) {
        console.error('Error:', error);
        renderErrorState(error.message);
    }
});

function renderCharts(reportData) {
    // Restore chart containers if they were replaced
    const chartsContainer = document.querySelector('.row.mb-4');
    chartsContainer.innerHTML = `
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    <h4>Attendance Overview</h4>
                </div>
                <div class="card-body">
                    <canvas id="attendanceChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    <h4>Class Performance</h4>
                </div>
                <div class="card-body">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Attendance Chart
    const attendanceCtx = document.getElementById('attendanceChart').getContext('2d');
    new Chart(attendanceCtx, {
        type: 'bar',
        data: {
            labels: reportData.classAttendance.map(c => c.name),
            datasets: [{
                label: 'Attendance Rate (%)',
                data: reportData.classAttendance.map(c => c.attendance_rate),
                backgroundColor: 'rgba(79, 70, 229, 0.7)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // Performance Chart
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    new Chart(performanceCtx, {
        type: 'line',
        data: {
            labels: reportData.weeklyPerformance.map((_, i) => `Week ${i+1}`).reverse(),
            datasets: [{
                label: 'Weekly Attendance Rate (%)',
                data: reportData.weeklyPerformance.map(w => w.attendance_rate).reverse(),
                borderColor: 'rgba(79, 70, 229, 1)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function renderErrorState(errorMessage) {
    const chartsContainer = document.querySelector('.row.mb-4');
    chartsContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage || 'Failed to load reports data.'}
                <a href="javascript:location.reload()" class="alert-link ms-2">Try again</a>
            </div>
        </div>
    `;
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
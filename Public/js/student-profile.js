document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Load profile data
    const response = await fetch('/student/profile/data', {
      credentials: 'include'
    });
    const profile = await response.json();

    // Populate form
    document.getElementById('firstName').value = profile.first_name;
    document.getElementById('lastName').value = profile.last_name;
    document.getElementById('email').value = profile.email;
    document.getElementById('profileName').textContent = `${profile.first_name} ${profile.last_name}`;
    document.getElementById('profileInitials').textContent = 
      (profile.first_name[0] + profile.last_name[0]).toUpperCase();

    // Setup form submission
    document.getElementById('profileForm').addEventListener('submit', saveProfile);

  } catch (error) {
    console.error('Error:', error);
    showErrorToast('Failed to load profile');
  }
});

async function saveProfile(e) {
  e.preventDefault();
  
  try {
    const response = await fetch('/student/profile/update', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value
      })
    });

    if (response.ok) {
      showSuccessToast('Profile updated successfully');
    } else {
      throw new Error('Update failed');
    }
  } catch (error) {
    showErrorToast('Failed to update profile');
  }
}
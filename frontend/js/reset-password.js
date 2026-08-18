document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    const messageDiv = document.getElementById("message");
    
    if (!token) {
        messageDiv.style.display = "block";
        messageDiv.className = "alert alert-danger";
        messageDiv.innerText = "Error: Invalid or missing password reset token.";
        document.getElementById("resetPasswordForm").style.display = "none";
        return;
    }
    
    document.getElementById("token").value = token;
});

document.getElementById("resetPasswordForm").addEventListener("submit", resetPassword);

async function resetPassword(event) {
    event.preventDefault();
    
    const token = document.getElementById("token").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const messageDiv = document.getElementById("message");
    
    messageDiv.style.display = "block";
    messageDiv.className = "alert alert-info";
    messageDiv.innerText = "Processing password reset...";
    
    if (password !== confirmPassword) {
        messageDiv.className = "alert alert-danger";
        messageDiv.innerText = "Passwords do not match.";
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append("token", token);
        formData.append("password", password);
        
        const response = await fetch(`/reset-password`, {
            method: "POST",
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            messageDiv.className = "alert alert-success";
            messageDiv.innerText = "Password reset successfully! Redirecting to login...";
            setTimeout(() => {
                window.location.href = "login.html";
            }, 3000);
        } else {
            messageDiv.className = "alert alert-danger";
            messageDiv.innerText = result.detail || result.error || "Failed to reset password.";
        }
    } catch (err) {
        console.error("Error resetting password:", err);
        messageDiv.className = "alert alert-danger";
        messageDiv.innerText = "Network error. Please try again later.";
    }
}

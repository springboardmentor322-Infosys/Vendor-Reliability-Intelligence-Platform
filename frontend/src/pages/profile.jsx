 import { useEffect, useState } from "react";
import "../styles/profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please login to view your profile.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/auth/profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch profile");
      }

      setUser(data.user);

      setFormData({
        full_name: data.user.full_name || "",
        phone: data.user.phone || "",
      });
    } catch (err) {
      console.error("Profile Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please login again.");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/auth/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            phone: formData.phone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setUser((previousUser) => ({
        ...previousUser,
        ...data.user,
      }));

      setFormData({
        full_name: data.user.full_name || "",
        phone: data.user.phone || "",
      });

      setMessage("Profile updated successfully.");
      setEditing(false);

      // Keep localStorage user information updated
      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          ...data.user,
        })
      );
    } catch (err) {
      console.error("Update Profile Error:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <h2>Loading Profile...</h2>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <h2>Unable to Load Profile</h2>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">

        <h1>Vendor Reliability Intelligence Platform</h1>
        <h2>User Profile</h2>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!editing ? (
          <>
            <div className="profile-details">

              <div className="profile-row">
                <span className="label">Full Name</span>
                <span className="value">
                  {user?.full_name || "Not available"}
                </span>
              </div>

              <div className="profile-row">
                <span className="label">Email</span>
                <span className="value">
                  {user?.email || "Not available"}
                </span>
              </div>

              <div className="profile-row">
                <span className="label">Phone</span>
                <span className="value">
                  {user?.phone || "Not provided"}
                </span>
              </div>

              <div className="profile-row">
                <span className="label">Role</span>
                <span className="value">
                  {user?.role || "Not available"}
                </span>
              </div>

              <div className="profile-row">
                <span className="label">Status</span>
                <span className="value active">
                  {user?.status || "Active"}
                </span>
              </div>

              <div className="profile-row">
                <span className="label">User ID</span>
                <span className="value">
                  {user?.user_id}
                </span>
              </div>

            </div>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setError("");
                setEditing(true);
              }}
            >
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleUpdate}>

            <div className="profile-form">

              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                />

                <small>
                  Email cannot be changed from the profile page.
                </small>
              </div>

              <div className="form-group">
                <label>Phone</label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Role</label>

                <input
                  type="text"
                  value={user?.role || ""}
                  disabled
                />
              </div>

              <div className="profile-buttons">

                <button type="submit">
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setMessage("");
                    setError("");
                    setFormData({
                      full_name: user?.full_name || "",
                      phone: user?.phone || "",
                    });
                  }}
                >
                  Cancel
                </button>

              </div>

            </div>

          </form>
        )}

      </div>
    </div>
  );
}

export default Profile;
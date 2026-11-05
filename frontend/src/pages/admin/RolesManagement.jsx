import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const rolePermissions = {
  ADMIN: [
    "Manage dashboard",
    "Manage packages",
    "Manage enquiries",
    "Manage journal",
    "Manage users and roles",
    "View activity logs",
    "Manage quotes",
  ],
  EDITOR: [
    "Manage dashboard",
    "View enquiries",
    "Manage packages",
    "Manage journal",
    "Manage seasonal prices",
  ],
  CONSULTANT: [
    "Manage dashboard",
    "View packages",
    "Manage assigned enquiries",
    "Manage customer follow-ups",
    "Create and manage quotes",
  ],
};

const roleDescriptions = {
  ADMIN: "Workspace administration, team oversight and full operational access.",
  EDITOR: "Manage travel packages, seasonal prices and journal content.",
  CONSULTANT: "Manage customer enquiries, traveller follow-ups and personalised quotes.",
};

const roleLabels = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  CONSULTANT: "Consultant",
};

const inputClass =
  "w-full rounded-lg border border-[#e4e7df] bg-white px-4 py-3 text-sm outline-none focus:border-[#174b38]";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeUser = (user) => ({
  ...user,
  roleName: user.role?.name || user.roleName || "CONSULTANT",
  status: user.status === "ACTIVE" ? "Active" : "Inactive",
  joined: formatDate(user.createdAt),
});

function RolesManagement() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("team");
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleName: "CONSULTANT",
  });

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/users");
      setUsers((response.data.data || []).map(normalizeUser));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load team members. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.name, user.email, roleLabels[user.roleName], user.roleName, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [users, search]);

  const activeCount = users.filter((user) => user.status === "Active").length;

  const updateStatus = async (user) => {
    setError("");
    setSuccess("");
    const nextStatus = user.status === "Active" ? "INACTIVE" : "ACTIVE";
    try {
      const response = await api.put(`/users/${user.id}`, {
        status: nextStatus,
      });
      const updated = normalizeUser(response.data.data);
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item))
      );
      setSuccess(`${user.name} is now ${nextStatus === "ACTIVE" ? "active" : "inactive"}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update member status.");
    }
  };

  const updateRole = async (user, roleName) => {
    if (roleName === user.roleName) return;
    setError("");
    setSuccess("");
    try {
      const response = await api.put(`/users/${user.id}`, { roleName });
      const updated = normalizeUser(response.data.data);
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item))
      );
      setSuccess(`${user.name}'s role was updated to ${roleLabels[roleName]}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update member role.");
    }
  };

  const addUser = async (event) => {
    event.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/users", {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone.trim() || undefined,
        password: newUser.password,
        roleName: newUser.roleName,
      });
      setUsers((prev) => [normalizeUser(response.data.data), ...prev]);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        password: "",
        roleName: "CONSULTANT",
      });
      setShowModal(false);
      setSuccess("Team member added successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add team member.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Are you sure you want to remove ${user.name}?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/users/${user.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setSuccess(`${user.name} was removed.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove team member.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f4] px-4 py-7 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#a17e50]">
              Administration
            </p>
            <h1 className="font-serif text-3xl text-[#174b38]">
              Roles & Permissions
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage your team members and control their access.
            </p>
          </div>

          {activeTab === "team" && (
            <button
              onClick={() => {
                setError("");
                setShowModal(true);
              }}
              className="rounded-lg bg-[#174b38] px-5 py-3 text-sm text-white hover:bg-[#103b2c]"
            >
              + Add team member
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
            <p className="text-sm text-gray-500">Total team members</p>
            <p className="mt-2 text-3xl font-semibold text-[#174b38]">
              {users.length}
            </p>
          </div>
          <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
            <p className="text-sm text-gray-500">Active members</p>
            <p className="mt-2 text-3xl font-semibold text-green-700">
              {activeCount}
            </p>
          </div>
          <div className="rounded-xl border border-[#e8ebe4] bg-white p-5">
            <p className="text-sm text-gray-500">Available roles</p>
            <p className="mt-2 text-3xl font-semibold text-[#174b38]">
              {Object.keys(rolePermissions).length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-6 border-b border-[#e2e7df]">
          <button
            onClick={() => setActiveTab("team")}
            className={`border-b-2 pb-3 text-sm font-medium ${
              activeTab === "team"
                ? "border-[#174b38] text-[#174b38]"
                : "border-transparent text-gray-400"
            }`}
          >
            Team members
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`border-b-2 pb-3 text-sm font-medium ${
              activeTab === "permissions"
                ? "border-[#174b38] text-[#174b38]"
                : "border-transparent text-gray-400"
            }`}
          >
            Role permissions
          </button>
        </div>

        {activeTab === "team" ? (
          <div className="overflow-hidden rounded-xl border border-[#e8ebe4] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ea] p-5">
              <div>
                <h2 className="font-serif text-xl text-[#174b38]">
                  Team directory
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  {filteredUsers.length} members found
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members..."
                className="w-full rounded-lg border border-[#e4e7df] px-4 py-2.5 text-sm outline-none focus:border-[#174b38] sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-[#f8f9f6] text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Team member</th>
                    <th className="px-5 py-4 font-medium">Role</th>
                    <th className="px-5 py-4 font-medium">Joined</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-12 text-center text-sm text-gray-400">
                        Loading team members...
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-[#edf0ea] text-sm">
                        <td className="px-5 py-4">
                          <p className="font-medium text-[#263b30]">{user.name}</p>
                          <p className="mt-1 text-xs text-gray-400">{user.email}</p>
                          {user.phone && (
                            <p className="mt-1 text-xs text-gray-400">{user.phone}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={user.roleName}
                            onChange={(event) => updateRole(user, event.target.value)}
                            className="rounded-lg border border-[#e4e7df] bg-white px-3 py-2 text-xs text-[#174b38] outline-none focus:border-[#174b38]"
                          >
                            {Object.keys(rolePermissions).map((role) => (
                              <option key={role} value={role}>{roleLabels[role]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4 text-gray-500">{user.joined}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs ${
                              user.status === "Active"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => updateStatus(user)}
                              className="text-xs text-[#174b38] hover:underline"
                            >
                              {user.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => removeUser(user)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-5 py-12 text-center text-sm text-gray-400">
                        No team members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl border border-[#e8ebe4] bg-white p-4">
              <h2 className="mb-4 font-serif text-lg text-[#174b38]">
                Available roles
              </h2>
              <div className="space-y-2">
                {Object.keys(rolePermissions).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm ${
                      selectedRole === role
                        ? "bg-[#174b38] text-white"
                        : "text-gray-600 hover:bg-[#f4f6f1]"
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#e8ebe4] bg-white p-6">
              <p className="text-xs uppercase tracking-widest text-[#a17e50]">
                Role details
              </p>
              <h2 className="mt-2 font-serif text-2xl text-[#174b38]">
                {roleLabels[selectedRole]}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {roleDescriptions[selectedRole]}
              </p>

              <h3 className="mb-4 mt-8 text-sm font-semibold text-[#263b30]">
                Included permissions
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {rolePermissions[selectedRole].map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center gap-3 rounded-lg bg-[#f7f8f4] p-4 text-sm text-gray-700"
                  >
                    <span className="text-green-700">✓</span>
                    {permission}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-gray-400">
                These describe the intended access for each role. Backend
                permission enforcement is separate and is not provided by this page.
              </p>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <form
            onSubmit={addUser}
            className="my-6 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl text-[#174b38]">
                  Add team member
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Add a new member to your admin team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xl text-gray-400"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Full name
                </label>
                <input
                  required
                  className={inputClass}
                  value={newUser.name}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email address
                </label>
                <input
                  required
                  type="email"
                  className={inputClass}
                  value={newUser.email}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Phone number (optional)
                </label>
                <input
                  className={inputClass}
                  value={newUser.phone}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Temporary password
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className={inputClass}
                  value={newUser.password}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Assign role
                </label>
                <select
                  className={inputClass}
                  value={newUser.roleName}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, roleName: event.target.value }))
                  }
                >
                  {Object.keys(rolePermissions).map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#174b38] px-5 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add member"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default RolesManagement;

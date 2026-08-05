import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import type { UserRole } from "../types";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "farmer" as UserRole,
    community: "",
    district: "Tamale Metro",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/accounts/register/", form);
      navigate("/login");
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data ? Object.values(data).flat().join(" ") : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-brand-green mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm mb-6">Join AgriRevolution as a farmer, dealer, or buyer</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                required
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              required
              value={form.phone_number}
              onChange={(e) => update("phone_number", e.target.value)}
              placeholder="0XXXXXXXXX"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value as UserRole)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="farmer">Farmer</option>
              <option value="dealer">Equipment Dealer</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
            <input
              value={form.community}
              onChange={(e) => update("community", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-brand-green font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

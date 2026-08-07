import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import type { UserRole } from "../types";
import Button from "../components/ui/Button";
import logo from "../assets/logo.svg";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

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
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-center mb-5">
          <img src={logo} alt="AgriRevolution" className="w-14 h-14 rounded-full shadow-sm" />
        </div>
        <h1 className="text-page-title">Create your account</h1>
        <p className="text-page-subtitle mb-6">Join AgriRevolution as a farmer, dealer, or buyer</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                required
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone number</label>
            <input
              required
              value={form.phone_number}
              onChange={(e) => update("phone_number", e.target.value)}
              placeholder="0XXXXXXXXX"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>I am a...</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value as UserRole)}
              className={inputClass}
            >
              <option value="farmer">Farmer</option>
              <option value="dealer">Equipment Dealer</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Community</label>
            <input
              value={form.community}
              onChange={(e) => update("community", e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
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

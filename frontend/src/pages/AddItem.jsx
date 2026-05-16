import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import { API_BASE, uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./AddItem.css";

function AddItem() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const showToast = useToast();

  useEffect(() => {
    if (id) {
      setLoading(true);
      axios
        .get(`${API_BASE}/api/listings/${id}`, { withCredentials: true })
        .then((res) => {
          setFormData({
            title: res.data.title,
            description: res.data.description,
            category: res.data.category,
            price: res.data.price,
            image: null,
          });
          if (res.data.image) {
            setImagePreview(uploadUrl(res.data.image));
          }
        })
        .catch((err) => {
          console.error("Failed to load listing:", err);
          showToast("Failed to load listing", "error");
        })
        .finally(() => setLoading(false));
    }
  }, [id, showToast]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image" && files.length > 0) {
      setFormData((prev) => ({ ...prev, image: files[0] }));
      setImagePreview(URL.createObjectURL(files[0]));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = new FormData();
    for (const key in formData) {
      if (formData[key]) {
        payload.append(key, formData[key]);
      }
    }
    const endpoint = id
      ? `${API_BASE}/api/listings/${id}`
      : `${API_BASE}/api/listings`;
    const method = id ? axios.put : axios.post;
    setSubmitting(true);
    method(endpoint, payload, { withCredentials: true })
      .then(() => {
        showToast(
          id ? "Item updated successfully!" : "Item added successfully!",
          "success"
        );
        setTimeout(() => navigate("/youritems"), 1500);
      })
      .catch((err) => {
        showToast(
          "Something went wrong: " +
            (err.response?.data?.message || err.message),
          "error"
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="page-shell add-item-page">
      <Navbar />
      <main className="page-content add-item-main">
        <PageHeader
          kicker="Marketplace"
          title={id ? "Edit Item" : "Add New Item"}
          subtitle="Share details and a photo so buyers can find your listing."
        />
        {loading ? (
          <p className="loading-message">Loading…</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="add-item-form"
          >
            <input
              type="text"
              name="title"
              placeholder="Title"
              value={formData.title}
              onChange={handleChange}
              required
              className="form-control"
            />
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              required
              className="form-control form-textarea"
            />
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="">Select Category</option>
              <option value="Stationary">Stationary</option>
              <option value="Electronics">Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Clothing">Clothing</option>
              <option value="Sports">Sports</option>
              <option value="Others">Others</option>
            </select>
            <input
              type="number"
              name="price"
              placeholder="Price"
              value={formData.price}
              onChange={handleChange}
              required
              className="form-control"
            />
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              className="form-control form-file-input"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="image-preview" />
            )}
            <button type="submit" className="submit-button" disabled={submitting}>
              {submitting
                ? "Saving…"
                : id
                  ? "Update Item"
                  : "Add Item"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default AddItem;

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { FaCamera, FaTimes } from "react-icons/fa";
import Navbar from "../components/navbar";
import Footer from "../components/Shared/Footer";
import PageHeader from "../components/Shared/PageHeader";
import { API_BASE, uploadUrl } from "../config";
import { useToast } from "../context/ToastContext";
import "./AddItem.css";

const MAX_PHOTOS = 5;
const UPLOAD_KEYS = ["image", "image2", "image3", "image4", "image5"];

function makePhotoId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildPhotoSlots(primary, extras = []) {
  const slots = [];
  if (primary) {
    slots.push({
      id: makePhotoId(),
      existing: primary,
      url: uploadUrl(primary),
    });
  }
  extras.forEach((filename) => {
    slots.push({
      id: makePhotoId(),
      existing: filename,
      url: uploadUrl(filename),
    });
  });
  return slots;
}

function AddItem() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
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
            price: String(res.data.price),
          });
          setPhotos(
            buildPhotoSlots(res.data.image, res.data.extra_images || [])
          );
        })
        .catch((err) => {
          console.error("Failed to load listing:", err);
          showToast("Failed to load listing", "error");
        })
        .finally(() => setLoading(false));
    }
  }, [id, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      showToast(`You can add up to ${MAX_PHOTOS} photos`, "error");
      return;
    }

    const accepted = files.slice(0, room);
    if (files.length > room) {
      showToast(`Only ${MAX_PHOTOS} photos allowed; extra files skipped`, "info");
    }

    setPhotos((prev) => [
      ...prev,
      ...accepted.map((file) => {
        const blobUrl = URL.createObjectURL(file);
        return {
          id: makePhotoId(),
          file,
          blobUrl,
          url: blobUrl,
        };
      }),
    ]);
  };

  const removePhoto = (photoId) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target?.blobUrl) URL.revokeObjectURL(target.blobUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const appendImagesToPayload = (payload) => {
    if (id) {
      const kept = photos.filter((p) => p.existing).map((p) => p.existing);
      payload.append("retain_images", JSON.stringify(kept));
      const newFiles = photos.filter((p) => p.file).map((p) => p.file);
      newFiles.forEach((file, index) => {
        payload.append(UPLOAD_KEYS[index] || UPLOAD_KEYS[UPLOAD_KEYS.length - 1], file);
      });
      return;
    }

    const files = photos.filter((p) => p.file).map((p) => p.file);
    files.forEach((file, index) => {
      payload.append(UPLOAD_KEYS[index] || UPLOAD_KEYS[UPLOAD_KEYS.length - 1], file);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== "" && value != null) payload.append(key, value);
    });
    appendImagesToPayload(payload);

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

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="page-shell add-item-page">
      <Navbar />
      <main className="page-content add-item-main">
        <PageHeader
          kicker="Marketplace"
          title={id ? "Edit Item" : "Add New Item"}
          subtitle={`Add up to ${MAX_PHOTOS} photos so buyers can see your item from every angle.`}
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
              placeholder="Price (₹)"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              className="form-control"
            />

            <div className="add-item-photos">
              <div className="add-item-photos-head">
                <label className="add-item-photos-label">Photos</label>
                <span className="add-item-photos-count">
                  {photos.length} / {MAX_PHOTOS}
                </span>
              </div>
              <p className="add-item-photos-hint">
                First photo is the cover image. Drag in multiple files or tap to
                browse.
              </p>

              <div className="add-item-photo-grid">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="add-item-photo-slot">
                    <img src={photo.url} alt="" className="add-item-photo-img" />
                    {index === 0 && (
                      <span className="add-item-photo-cover">Cover</span>
                    )}
                    <button
                      type="button"
                      className="add-item-photo-remove"
                      onClick={() => removePhoto(photo.id)}
                      aria-label="Remove photo"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}

                {canAddMore && (
                  <button
                    type="button"
                    className="add-item-photo-add"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaCamera aria-hidden />
                    <span>Add photo</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="add-item-photo-input"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

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
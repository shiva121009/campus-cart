import { useEffect, useState } from "react";
import api from "../../api/client";

function StudentIdImage({ userId }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let objectUrl;
    api
      .get(`/api/admin/student-id/${userId}`, { responseType: "blob" })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId]);

  if (!src) {
    return <p className="admin-verify-meta">ID image unavailable</p>;
  }

  return (
    <img src={src} alt="Student ID" className="admin-id-preview" />
  );
}

export default StudentIdImage;

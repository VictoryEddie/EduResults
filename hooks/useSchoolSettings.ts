import { useState, useEffect } from "react";

interface SchoolSettings {
  schoolName: string;
  location: string;
  motto: string;
  logo: string | null;
}

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: "EduResults",
    location: "",
    motto: "",
    logo: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return { settings, loading };
}

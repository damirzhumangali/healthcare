import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Camera, Trash2, Upload, X } from "lucide-react";
import {
  saveProfileAvatar,
  saveProfileDetails,
  type SessionUser,
  updateCurrentUser,
} from "../lib/auth";
import { isAcceptedAvatarFile, persistAvatar, resolveAvatarUrl } from "../lib/avatar";
import { normalizePatientFullName, validatePatientFullName } from "../lib/patientName";
import AvatarCircle from "./AvatarCircle";

type ProfileAvatarDialogProps = {
  open: boolean;
  user: SessionUser | null;
  doctorFallback?: boolean;
  showNameField?: boolean;
  requireName?: boolean;
  onClose: () => void;
  onSaved: (user: SessionUser) => void;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("avatar_read_failed"));
    reader.readAsDataURL(file);
  });
}

export default function ProfileAvatarDialog({
  open,
  user,
  doctorFallback = false,
  showNameField = false,
  requireName = false,
  onClose,
  onSaved,
}: ProfileAvatarDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentAvatar = useMemo(
    () => resolveAvatarUrl(user, { doctorFallback }),
    [doctorFallback, user],
  );

  useEffect(() => {
    if (!open) {
      setDraftUrl(null);
      setDraftName("");
      setRemoved(false);
      setError(null);
      setSaving(false);
      return;
    }
    setDraftName(user?.name || "");
  }, [open]);

  if (!open) return null;

  const preview = removed
    ? resolveAvatarUrl(
        {
          ...user,
          avatar_url: null,
          avatarUrl: null,
        },
        { doctorFallback },
      )
    : draftUrl || currentAvatar;
  const displayName = user?.name || user?.email || "Профиль";
  const normalizedDraftName = normalizePatientFullName(draftName) || draftName.trim();
  const isPatientRole = user?.role === "patient";
  const canDismiss = !requireName;

  function avatarSaveErrorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "";
    switch (code) {
      case "invalid_name":
        return "Введите имя и фамилию пациента полностью.";
      case "profile_network_failed":
      case "profile_save_failed":
        return "Не удалось сохранить профиль. Попробуйте ещё раз.";
      case "invalid_avatar_type":
        return "Разрешены только JPG, PNG или WEBP.";
      case "avatar_too_large":
        return "Файл слишком большой. Максимум 5 МБ.";
      case "avatar_auth_failed":
        return "Сессия истекла. Войдите заново и повторите попытку.";
      default:
        return "Не удалось сохранить фото. Попробуйте ещё раз.";
    }
  }

  function saveAvatarLocally() {
    const next = updateCurrentUser({
      ...(showNameField && normalizedDraftName ? { name: normalizedDraftName } : {}),
      avatar_url: removed ? null : draftUrl || user?.avatar_url || user?.avatarUrl || null,
      avatarUrl: removed ? null : draftUrl || user?.avatarUrl || user?.avatar_url || null,
    });
    persistAvatar(next, next.avatar_url || next.avatarUrl || null);
    onSaved(next);
    onClose();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const check = isAcceptedAvatarFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setDraftUrl(dataUrl);
      setRemoved(false);
    } catch {
      setError("Не удалось прочитать изображение. Попробуйте другой файл.");
    }
  }

  function handleRemove() {
    setDraftUrl(null);
    setRemoved(true);
    setError(null);
  }

  async function handleSave() {
    if (showNameField) {
      const nameError = isPatientRole ? validatePatientFullName(draftName) : null;
      if (nameError) {
        setError(nameError);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      let nextUser = user ?? null;

      if (showNameField && normalizedDraftName && normalizedDraftName !== (user?.name || "").trim()) {
        nextUser = await saveProfileDetails({ name: normalizedDraftName });
      }

      const next = await saveProfileAvatar({
        avatarUrl: removed ? null : draftUrl || user?.avatar_url || user?.avatarUrl || null,
        remove: removed,
      });

      const merged = {
        ...(nextUser || user || {}),
        ...next,
        ...(showNameField && normalizedDraftName ? { name: normalizedDraftName } : {}),
      };

      persistAvatar(merged, merged.avatar_url || merged.avatarUrl || null);
      onSaved(merged);
      onClose();
    } catch (saveError) {
      const code = saveError instanceof Error ? saveError.message : "";
      if (code === "avatar_route_missing" || code === "avatar_network_failed") {
        saveAvatarLocally();
        return;
      }
      setError(avatarSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-avatar-modal" role="dialog" aria-modal="true" aria-label="Настройки профиля">
      <div className="profile-avatar-modal__backdrop" onClick={canDismiss ? onClose : undefined} />
      <div className="profile-avatar-modal__card">
        <div className="profile-avatar-modal__head">
          <div>
            <strong>{showNameField ? "Профиль пациента" : "Фото профиля"}</strong>
            <p>
              {showNameField
                ? "Укажите ваше имя и фамилию. Фото можно загрузить в JPG, PNG или WEBP до 5 МБ."
                : "Загрузите JPG, PNG или WEBP до 5 МБ. Фото автоматически центрируется в круге."}
            </p>
          </div>
          {canDismiss ? (
            <button type="button" className="profile-avatar-modal__icon-btn" onClick={onClose} aria-label="Закрыть">
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="profile-avatar-modal__body">
          <AvatarCircle
            name={displayName}
            src={preview}
            size={112}
            alt={displayName}
          />
          <div className="profile-avatar-modal__meta">
            <strong>{displayName}</strong>
            <span>{user?.role === "doctor" ? "Врач" : user?.role === "admin" ? "Администратор" : "Профиль"}</span>
          </div>
        </div>

        {showNameField ? (
          <div className="profile-avatar-modal__field">
            <label htmlFor="profile-full-name">Имя и фамилия</label>
            <input
              id="profile-full-name"
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Например: Дамир Жумангали"
              autoComplete="name"
            />
          </div>
        ) : null}

        <div className="profile-avatar-modal__actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="profile-avatar-modal__btn profile-avatar-modal__btn--primary"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} />
            Выбрать фото
          </button>
          <button
            type="button"
            className="profile-avatar-modal__btn"
            onClick={handleRemove}
          >
            <Trash2 size={16} />
            Убрать фото
          </button>
        </div>

        {error ? <div className="profile-avatar-modal__error">{error}</div> : null}

        <div className="profile-avatar-modal__footer">
          {canDismiss ? (
            <button type="button" className="profile-avatar-modal__btn" onClick={onClose}>
              Отмена
            </button>
          ) : null}
          <button
            type="button"
            className="profile-avatar-modal__btn profile-avatar-modal__btn--save"
            onClick={handleSave}
            disabled={saving}
          >
            <Camera size={16} />
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

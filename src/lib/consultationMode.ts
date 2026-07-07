export type ConsultationMode = "in_person" | "online_home" | "online_ward";
export type AppointmentRequestType = "regular" | "ward_online";

type ConsultationModeCarrier = {
  consultation_mode?: string | null;
  consultationMode?: string | null;
  request_type?: string | null;
  requestType?: string | null;
  wants_online?: boolean | null;
  wantsOnline?: boolean | null;
  room_label?: string | null;
  roomLabel?: string | null;
  ward_label?: string | null;
  wardLabel?: string | null;
  bed_label?: string | null;
  bedLabel?: string | null;
};

export function normalizeConsultationMode(value: string | null | undefined): ConsultationMode | null {
  if (value === "online_home" || value === "online_ward" || value === "in_person") {
    return value;
  }
  if (value === "online") return "online_home";
  if (value === "ward") return "online_ward";
  return null;
}

export function normalizeAppointmentRequestType(
  value: string | null | undefined,
): AppointmentRequestType | null {
  if (value === "regular" || value === "ward_online") return value;
  return null;
}

export function readWardLabel(item: ConsultationModeCarrier | null | undefined) {
  return item?.ward_label || item?.wardLabel || "";
}

export function readBedLabel(item: ConsultationModeCarrier | null | undefined) {
  return item?.bed_label || item?.bedLabel || "";
}

export function readRoomLabel(item: ConsultationModeCarrier | null | undefined) {
  return item?.room_label || item?.roomLabel || "";
}

export function resolveConsultationMode(
  item: ConsultationModeCarrier | null | undefined,
): ConsultationMode {
  const explicitMode = normalizeConsultationMode(item?.consultation_mode || item?.consultationMode);
  if (explicitMode) return explicitMode;

  const wantsOnline = Boolean(item?.wants_online || item?.wantsOnline);
  if (!wantsOnline) return "in_person";

  if (readWardLabel(item) || readBedLabel(item)) return "online_ward";
  return "online_home";
}

export function resolveAppointmentRequestType(
  item: ConsultationModeCarrier | null | undefined,
): AppointmentRequestType {
  const explicitType = normalizeAppointmentRequestType(item?.request_type || item?.requestType);
  if (explicitType) return explicitType;
  return resolveConsultationMode(item) === "online_ward" ? "ward_online" : "regular";
}

export function isOnlineConsultation(item: ConsultationModeCarrier | null | undefined) {
  return resolveConsultationMode(item) !== "in_person";
}

export function isHomeOnlineConsultation(item: ConsultationModeCarrier | null | undefined) {
  return resolveConsultationMode(item) === "online_home";
}

export function isWardOnlineConsultation(item: ConsultationModeCarrier | null | undefined) {
  return resolveConsultationMode(item) === "online_ward";
}

export function isWardOnlineRequest(item: ConsultationModeCarrier | null | undefined) {
  return resolveAppointmentRequestType(item) === "ward_online";
}

export const siteVisitStatuses = Object.freeze({
  scheduled: "scheduled",
  completed: "completed",
  cancelled: "cancelled",
  noShow: "no_show",
});

export const siteVisitStatusOptions = Object.freeze([
  { value: siteVisitStatuses.scheduled, label: "Scheduled" },
  { value: siteVisitStatuses.completed, label: "Completed" },
  { value: siteVisitStatuses.cancelled, label: "Cancelled" },
  { value: siteVisitStatuses.noShow, label: "No Show" },
]);

export const getSiteVisitStatusLabel = (status) => siteVisitStatusOptions.find((option) => option.value === status)?.label ?? status;
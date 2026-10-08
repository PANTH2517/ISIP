import { MapPin, Video } from 'lucide-react';

/** Shows a meeting's venue, or a "Join meeting" link when the location is a URL. */
export default function MeetingLocation({ location, className = '' }) {
  if (!location) return null;
  const isLink = /^https?:\/\//i.test(location);
  return isLink ? (
    <a href={location} target="_blank" rel="noreferrer" className={`mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline ${className}`}>
      <Video className="h-3.5 w-3.5" />Join meeting
    </a>
  ) : (
    <p className={`mt-1 inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}><MapPin className="h-3.5 w-3.5" />{location}</p>
  );
}

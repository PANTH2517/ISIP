import { Link } from 'react-router-dom';

/** A person's name that opens their public profile (plain text when there is no account to link to). */
export default function PersonLink({ id, name, className = '' }) {
  if (!id) return <span className={className}>{name}</span>;
  return (
    <Link to={`/people/${id}`} className={`hover:text-indigo-600 hover:underline ${className}`} onClick={(e) => e.stopPropagation()}>
      {name}
    </Link>
  );
}

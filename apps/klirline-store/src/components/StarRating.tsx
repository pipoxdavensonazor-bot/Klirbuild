import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: false;
}

interface InteractiveStarRatingProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  interactive: true;
  onChange: (v: number) => void;
}

type Props = StarRatingProps | InteractiveStarRatingProps;

const SIZE = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' };

export const StarRating = (props: Props) => {
  const { value, size = 'md' } = props;
  const s = SIZE[size];

  if ('interactive' in props && props.interactive) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => props.onChange(n)} className="focus:outline-none">
            <Star className={`${s} transition-colors ${n <= value ? 'fill-accent text-accent' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>
    );
  }

  const stars = [];
  const full = Math.floor(value);
  const half = value % 1 >= 0.5;
  for (let i = 0; i < full; i++) stars.push(<Star key={`f${i}`} className={`${s} fill-accent text-accent`} />);
  if (half) stars.push(<StarHalf key="h" className={`${s} fill-accent text-accent`} />);
  for (let i = 0; i < 5 - full - (half ? 1 : 0); i++) stars.push(<Star key={`e${i}`} className={`${s} text-gray-300`} />);

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

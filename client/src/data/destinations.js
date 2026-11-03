import { photos } from './images';

/* Popular destinations featured on the homepage and /destinations. */
export const destinations = [
  { slug: 'bali', name: 'Bali', country: 'Indonesia', region: 'International', tagline: 'Temples, rice terraces & island sunsets', photo: photos.bali },
  { slug: 'maldives', name: 'Maldives', country: 'Maldives', region: 'International', tagline: 'Overwater villas on endless turquoise', photo: photos.maldives },
  { slug: 'switzerland', name: 'Switzerland', country: 'Switzerland', region: 'International', tagline: 'Alpine valleys, glaciers & scenic rail', photo: photos.switzerland },
  { slug: 'kerala', name: 'Kerala', country: 'India', region: 'India', tagline: 'Backwaters, tea hills & spice coasts', photo: photos.kerala },
  { slug: 'goa', name: 'Goa', country: 'India', region: 'India', tagline: 'Golden beaches & Portuguese charm', photo: photos.goa },
  { slug: 'manali', name: 'Manali', country: 'India', region: 'India', tagline: 'Snow trails in the Himalayan foothills', photo: photos.manali },
  { slug: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'International', tagline: 'Skylines, souks & desert dunes', photo: photos.dubai },
  { slug: 'paris', name: 'Paris', country: 'France', region: 'International', tagline: 'Boulevards, cafés & the City of Light', photo: photos.paris },
];

export const categories = ['Adventure', 'Honeymoon', 'Family', 'Luxury', 'Budget', 'Weekend Getaways'];

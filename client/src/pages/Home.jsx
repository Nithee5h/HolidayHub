import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Hero from '../components/home/Hero';
import PopularDestinations from '../components/home/PopularDestinations';
import HandpickedExperiences from '../components/home/HandpickedExperiences';
import WhyTravel from '../components/home/WhyTravel';
import Inspiration from '../components/home/Inspiration';
import Testimonials from '../components/home/Testimonials';
import CtaBand from '../components/home/CtaBand';
import '../components/home/Home.css';

export default function Home() {
  useDocumentTitle();
  return (
    <>
      <Hero />
      <PopularDestinations />
      <HandpickedExperiences />
      <WhyTravel />
      <Inspiration />
      <Testimonials />
      <CtaBand />
    </>
  );
}

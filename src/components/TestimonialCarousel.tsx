import { useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  Autoplay
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const testimonials = [
  {
    quote: "Une expérience incroyable, pleine de défis et de moments inoubliables. Chaque session est une nouvelle aventure !",
    name: "Joueur Alpha",
    avatar: "JA",
  },
  {
    quote: "Ce jeu est captivant. La stratégie est essentielle et chaque décision compte. Je suis accro !",
    name: "Explorateur Solitaire",
    avatar: "ES",
  },
  {
    quote: "J'ai découvert une communauté formidable et des heures de divertissement. C'est un jeu qui ne cesse de surprendre.",
    name: "Bâtisseur Pro",
    avatar: "BP",
  },
  {
    quote: "Le frisson de l'inconnu et la satisfaction de surmonter les obstacles me font revenir. Un incontournable pour les amateurs du genre.",
    name: "Survivante Élite",
    avatar: "SE",
  },
];

const TestimonialCarousel = () => {
  const plugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        {testimonials.map((testimonial, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg text-white h-full">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-4">
                  <p className="text-base md:text-lg text-gray-200 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Avatar className="w-10 h-10 border-2 border-white/20">
                      <AvatarImage src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${testimonial.name}`} />
                      <AvatarFallback className="bg-white/10">{testimonial.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-bold text-white font-mono">{testimonial.name}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};

export default TestimonialCarousel;
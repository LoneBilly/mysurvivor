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
    quote: "L'adrénaline de l'exploration est incroyable. On ne sait jamais sur quoi on va tomber. J'ai perdu ma première base, mais la deuxième est une forteresse !",
    name: "Izipeace",
    avatar: "I",
  },
  {
    quote: "Ce jeu ne pardonne pas, et c'est ça qui est bon. Chaque ressource compte, chaque décision a un impact. C'est la meilleure simulation de survie à laquelle j'ai joué.",
    name: "ShadowKiller92",
    avatar: "S",
  },
  {
    quote: "J'ai passé 15 jours à survivre, c'était intense ! Le système de construction est simple mais profond. Voir sa base grandir jour après jour, c'est gratifiant.",
    name: "Jacadu66",
    avatar: "J",
  },
  {
    quote: "Le frisson de croiser un autre joueur... allié ou ennemi ? Cette tension permanente est ce qui me fait revenir chaque jour. Un must pour les fans de survie.",
    name: "LaReineDuLoot",
    avatar: "L",
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
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
    quote: "Le système de construction de base est génial ! J'adore voir ma forteresse évoluer avec les niveaux, ça ajoute une vraie profondeur stratégique.",
    name: "BâtisseurPro",
    avatar: "B",
  },
  {
    quote: "La carte est incroyablement riche et variée. Que ce soit la forêt pour les ressources, l'hôpital pour les soins, ou le casino pour le frisson, chaque zone a son intérêt. L'exploration est un plaisir !",
    name: "CartographeFou",
    avatar: "C",
  },
  {
    quote: "Le PvP 24h/24 sur un serveur unique, c'est l'adrénaline pure ! Savoir que n'importe qui peut attaquer à tout moment rend chaque décision stratégique. C'est impitoyable et j'adore ça.",
    name: "ChasseurOmbre",
    avatar: "H",
  },
  {
    quote: "Le marché est une révolution ! Acheter et vendre des objets avec des prix fixés par les joueurs, c'est un système économique vivant et passionnant. J'ai fait fortune en vendant du bois !",
    name: "MarchandMalin",
    avatar: "M",
  },
  {
    quote: "Le design du jeu est une réussite. Pas de 3D tape-à-l'œil, mais des interfaces sobres et épurées qui créent une immersion folle. On se sent vraiment dans un terminal de survie.",
    name: "PixelArtiste",
    avatar: "P",
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
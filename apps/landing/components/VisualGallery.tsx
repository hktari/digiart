"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  src: string;
  alt: string;
  title: string;
}

const galleryItems: GalleryItem[] = [
  {
    src: "/booklets/artist-creating.png",
    alt: "Digital artist creating artwork on tablet in warm studio",
    title: "Create Your Art",
  },
  {
    src: "/booklets/booklet-product.png",
    alt: "Premium art booklet with beautiful prints on matte paper",
    title: "Premium Quality Booklets",
  },
  {
    src: "/booklets/printing-process.png",
    alt: "Professional printing process with premium paper",
    title: "Expert Printing & Fulfillment",
  },
  {
    src: "/booklets/subscriber-unboxing.png",
    alt: "Subscriber unboxing premium art booklet",
    title: "Delight Your Fans",
  },
  {
    src: "/booklets/growth-success.png",
    alt: "Abstract growth visualization representing artist success",
    title: "Grow Your Income",
  },
];

export function VisualGallery() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? galleryItems.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === galleryItems.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <section className="py-16 md:py-24 bg-paper-dark relative overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="font-serif font-bold text-3xl md:text-4xl text-center mb-12 md:mb-16"
        >
          Premium Quality, Collectible Design
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {galleryItems.map((item, index) => (
            <motion.div
              key={`gallery-${item.title}-${index}`}
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              className="relative h-80 overflow-hidden bg-paper shadow-lg rounded-xl cursor-pointer group"
              onClick={() => setSelectedImage(index)}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.4 }}
                className="relative w-full h-full"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileHover={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-0 left-0 right-0 p-4"
              >
                <p className="text-paper font-serif font-semibold text-lg">
                  {item.title}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-ink/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 bg-paper/10 hover:bg-paper/20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6 text-paper" />
            </motion.button>

            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-4 bg-paper/10 hover:bg-paper/20 rounded-full p-3 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-paper" />
            </motion.button>

            <motion.button
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 bg-paper/10 hover:bg-paper/20 rounded-full p-3 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-paper" />
            </motion.button>

            <motion.div
              key={currentIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-4xl max-h-[80vh] w-full"
            >
              <Image
                src={galleryItems[currentIndex].src}
                alt={galleryItems[currentIndex].alt}
                width={800}
                height={600}
                className="object-contain w-full h-auto rounded-lg"
                sizes="(max-width: 768px) 95vw, 80vw"
                priority
              />
              <div className="mt-4 text-center">
                <p className="text-paper font-serif font-semibold text-xl">
                  {galleryItems[currentIndex].title}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

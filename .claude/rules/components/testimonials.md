# testimonials

## Purpose

Swiper-based testimonials slider. Renders one slide at a time with looping, clickable pagination dots, and prev/next arrow navigation.

## Webflow Setup

Add to the wrapper element that contains the swiper container, pagination, and controls:

data-component="testimonials"

## Behavior

- **Init**: Initialises a Swiper instance targeting `.swiper` inside the component, wiring `.slider-prev` / `.slider-next` as navigation and `.swiper-pagination` as clickable dots.
- **Resize**: Not used
- **Breakpoint**: Not used

## Dependencies

- `swiper` — Navigation, Pagination, A11y modules
- `swiper/css`, `swiper/css/navigation`, `swiper/css/pagination`

## DOM Expectations

Elements matching `[data-component='testimonials']` must contain:

- `.swiper` — Swiper container (the `testimonial_list-wrapper`)
- `.swiper-wrapper` — slides wrapper (the `testimonial_list`)
- `.swiper-slide` — individual slides (the `testimonial_item` items)
- `.swiper-pagination` — empty div for dots
- `.slider-prev-absolute` / `.slider-next-absolute` — prev/next arrow buttons (positioned absolute)

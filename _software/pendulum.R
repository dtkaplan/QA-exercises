# draw a pendulum and it's velocity arrow.


draw_pendulum1 <- function(theta, V) {
  # theta is angular position; 
  # V velocity, theta per second.
  radius <- 1
  arrow_radius <- 1.1
  velocity <- tibble::tibble(ang = theta + seq(-V/2, V/2, length=100),
                             x = arrow_radius * sin(ang),
                             y = -arrow_radius * cos(ang))
  boby = -radius*cos(theta)
  bobx = radius*sin(theta)
  texty = -radius*cos(theta/2) / 3
  textx = radius * sin(theta/2) / 3
  suppressWarnings(
    gf_segment(0 + boby ~ 0 + bobx) |>
    gf_point(boby ~ bobx, size = 5) |>
    gf_path(y ~ x, data = velocity, color = "blue",
            arrow = arrow(length = unit(2, "mm"))) |>
    gf_lims( y = c(-arrow_radius - .1, 0), x = c(-1.2,1.2)) |>
    gf_text(texty ~ textx, label = expression(theta), size=6) |>
    gf_vline(xintercept = 0, linetype = 2) |>
    gf_refine(coord_fixed()) |>
    gf_theme(theme_void())
  )

}

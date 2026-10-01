"""
Brewing calculation utility functions, including ASBC standard conversions
between Specific Gravity (SG) and degrees Plato.
"""


def sg_to_plato(sg: float) -> float:
    """Convert Specific Gravity (20°C/20°C) to degrees Plato

    using the official ASBC Table 1 cubic polynomial.
    """
    if sg <= 0:
        raise ValueError("Specific gravity must be positive.")

    # Evaluated via Horner's method for numerical efficiency
    return ((135.997 * sg - 630.272) * sg + 1111.14) * sg - 616.868


def plato_to_sg(plato: float) -> float:
    """Convert degrees Plato to Specific Gravity (20°C/20°C)

    using the ASBC 3rd-order polynomial.
    """
    if plato < 0:
        raise ValueError("Degrees Plato cannot be negative.")

    # Evaluated via Horner's method
    return (
        1.0000131
        + plato * (0.00386777 + plato * (1.27447e-5 + plato * 6.34964e-8))
    )

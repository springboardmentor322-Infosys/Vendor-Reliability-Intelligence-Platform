def calculate_reliability_score(performance):
    """
    Calculate vendor reliability score from
    available operational performance metrics.

    Score range: 0 - 100
    """

    # ==========================================
    # DELIVERY SCORE
    # ==========================================

    total_deliveries = (
        performance.on_time_deliveries
        + performance.delayed_deliveries
    )

    if total_deliveries > 0:

        delivery_score = (
            performance.on_time_deliveries
            / total_deliveries
        ) * 100

    else:

        delivery_score = 0


    # ==========================================
    # QUALITY SCORE
    # ==========================================

    quality_score = (
        performance.quality_rating / 5
    ) * 100


    # ==========================================
    # SERVICE SCORE
    # ==========================================

    service_score = (
        performance.service_rating / 5
    ) * 100


    # ==========================================
    # RESPONSE SCORE
    #
    # <= 2 hours  = 100
    # >= 24 hours = 0
    # ==========================================

    response_time = performance.response_time

    response_score = max(
        0,
        min(
            100,
            100 - (
                response_time / 24
            ) * 100
        )
    )


    # ==========================================
    # ISSUE RESOLUTION SCORE
    #
    # <= 4 hours  = 100
    # >= 48 hours = 0
    # ==========================================

    resolution_time = (
        performance.issue_resolution_time
    )

    resolution_score = max(
        0,
        min(
            100,
            100 - (
                resolution_time / 48
            ) * 100
        )
    )


    # ==========================================
    # COMPLETION SCORE
    # ==========================================

    completion_score = max(
        0,
        min(
            100,
            performance.order_completion_rate
        )
    )


    # ==========================================
    # FINAL RELIABILITY SCORE
    # ==========================================

    score = (
        delivery_score * 0.30
        + quality_score * 0.20
        + service_score * 0.15
        + response_score * 0.10
        + resolution_score * 0.10
        + completion_score * 0.15
    )


    return round(
        max(0, min(100, score)),
        2
    )


def get_risk_level(score: float) -> str:

    if score >= 80:

        return "Low Risk"

    if score >= 60:

        return "Medium Risk"

    return "High Risk"
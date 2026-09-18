def validate_score(score):
    if score is None:
        return 0.0

    if score < 0 or score > 100:
        raise ValueError("Score must be between 0 and 100")

    return float(score)


def calculate_reliability_score(
    delivery_score,
    quality_score,
    payment_score,
    compliance_score
):
    delivery_score = validate_score(delivery_score)
    quality_score = validate_score(quality_score)
    payment_score = validate_score(payment_score)
    compliance_score = validate_score(compliance_score)

    score = (
        delivery_score +
        quality_score +
        payment_score +
        compliance_score
    ) / 4

    return round(score, 2)


def calculate_risk_level(score):
    score = validate_score(score)

    if score >= 80:
        return "Low"

    elif score >= 50:
        return "Medium"

    else:
        return "High"


def calculate_performance_score(
    on_time_deliveries,
    delayed_deliveries,
    quality_rating,
    order_completion_rate
):
    total_deliveries = (
        on_time_deliveries +
        delayed_deliveries
    )

    if total_deliveries > 0:
        delivery_score = (
            on_time_deliveries /
            total_deliveries
        ) * 100
    else:
        delivery_score = 0

    quality_rating = validate_score(quality_rating)
    order_completion_rate = validate_score(
        order_completion_rate
    )

    performance_score = (
        delivery_score +
        quality_rating +
        order_completion_rate
    ) / 3

    return round(performance_score, 2)

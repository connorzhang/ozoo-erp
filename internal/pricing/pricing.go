package pricing

import "math"

type Service struct{}

func NewService() *Service { return &Service{} }

type CalcRequest struct {
	CostGoods            float64 `json:"cost_goods"`
	CostFirstMile        float64 `json:"cost_first_mile"`
	CostLastMile         float64 `json:"cost_last_mile"`
	CostPackaging        float64 `json:"cost_packaging"`
	CostOther            float64 `json:"cost_other"`
	TargetProfit         float64 `json:"target_profit"`
	PlatformFeeRate      float64 `json:"platform_fee_rate"`
	PaymentFeeRate       float64 `json:"payment_fee_rate"`
	TaxRate              float64 `json:"tax_rate"`
	Rounding             float64 `json:"rounding"`
	MinPrice             float64 `json:"min_price"`
	PromotionDiscountPct float64 `json:"promotion_discount_pct"`
}

type CalcResponse struct {
	TotalCost            float64 `json:"total_cost"`
	BreakEvenPrice       float64 `json:"break_even_price"`
	RecommendedPrice     float64 `json:"recommended_price"`
	PromotionFloorPrice  float64 `json:"promotion_floor_price"`
	AssumedTotalFeeRate  float64 `json:"assumed_total_fee_rate"`
	TargetProfit         float64 `json:"target_profit"`
	PromotionDiscountPct float64 `json:"promotion_discount_pct"`
}

func (s *Service) Calc(r CalcRequest) CalcResponse {
	totalCost := r.CostGoods + r.CostFirstMile + r.CostLastMile + r.CostPackaging + r.CostOther
	totalFeeRate := clamp01(r.PlatformFeeRate) + clamp01(r.PaymentFeeRate) + clamp01(r.TaxRate)
	if totalFeeRate >= 0.95 {
		totalFeeRate = 0.95
	}

	breakEven := solvePrice(totalCost, 0, totalFeeRate)
	reco := solvePrice(totalCost, r.TargetProfit, totalFeeRate)

	if r.MinPrice > 0 && reco < r.MinPrice {
		reco = r.MinPrice
	}

	rounding := r.Rounding
	if rounding <= 0 {
		rounding = 1
	}
	breakEven = roundUpTo(breakEven, rounding)
	reco = roundUpTo(reco, rounding)

	disc := clamp01(r.PromotionDiscountPct / 100.0)
	promoFloor := reco
	if disc > 0 {
		promoFloor = roundUpTo(reco*(1-disc), rounding)
	}

	return CalcResponse{
		TotalCost:            roundTo(totalCost, 4),
		BreakEvenPrice:       breakEven,
		RecommendedPrice:     reco,
		PromotionFloorPrice:  promoFloor,
		AssumedTotalFeeRate:  roundTo(totalFeeRate, 6),
		TargetProfit:         r.TargetProfit,
		PromotionDiscountPct: r.PromotionDiscountPct,
	}
}

func solvePrice(cost, profit, feeRate float64) float64 {
	denom := 1 - clamp01(feeRate)
	if denom <= 0.000001 {
		denom = 0.000001
	}
	return (cost + profit) / denom
}

func roundUpTo(v, step float64) float64 {
	if step <= 0 {
		return v
	}
	return math.Ceil(v/step) * step
}

func roundTo(v float64, digits int) float64 {
	if digits <= 0 {
		return math.Round(v)
	}
	p := math.Pow(10, float64(digits))
	return math.Round(v*p) / p
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}


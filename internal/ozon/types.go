package ozon

type RolesResponse struct {
	Roles     []Role `json:"roles"`
	ExpiresAt string `json:"expires_at"`
}

type Role struct {
	Name    string   `json:"name"`
	Methods []string `json:"methods"`
}

type SellerInfoResponse struct {
	Company struct {
		Name          string `json:"name"`
		OwnershipForm string `json:"ownership_form"`
		LegalName     string `json:"legal_name"`
		INN           string `json:"inn"`
		OGRN          string `json:"ogrn"`
		TaxSystem     string `json:"tax_system"`
		Currency      string `json:"currency"`
		Country       string `json:"country"`
	} `json:"company"`
}


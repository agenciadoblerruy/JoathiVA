<?php
/**
 * JoathiVA portal callout.
 *
 * @package packers_agency
 */

$packers_agency_portal_label = get_theme_mod(
	'packers_agency_header_btn_text',
	__( 'Ingresar a JoathiVA', 'packers-agency' )
);

$packers_agency_portal_url = get_theme_mod(
	'packers_agency_header_btn_url',
	home_url( '/v/' )
);

if ( empty( $packers_agency_portal_label ) ) {
	$packers_agency_portal_label = __( 'Ingresar a JoathiVA', 'packers-agency' );
}

if ( empty( $packers_agency_portal_url ) ) {
	$packers_agency_portal_url = home_url( '/v/' );
}
?>

<section class="joathiva-portal-section">
	<div class="container">
		<div class="joathiva-portal-card">
			<div class="joathiva-portal-copy">
				<span class="joathiva-portal-eyebrow"><?php esc_html_e( 'Portal operativo', 'packers-agency' ); ?></span>
				<h2><?php esc_html_e( 'JoathiVA', 'packers-agency' ); ?></h2>
				<p><?php esc_html_e( 'CRM, agenda, operaciones y seguimiento diario en una sola vista. Acceso directo al trabajo operativo de JoathiLogística.', 'packers-agency' ); ?></p>
				<div class="joathiva-portal-pills" aria-hidden="true">
					<span><?php esc_html_e( 'CRM', 'packers-agency' ); ?></span>
					<span><?php esc_html_e( 'Agenda', 'packers-agency' ); ?></span>
					<span><?php esc_html_e( 'Operaciones', 'packers-agency' ); ?></span>
					<span><?php esc_html_e( 'Cliente', 'packers-agency' ); ?></span>
				</div>
			</div>
			<div class="joathiva-portal-actions">
				<a class="joathiva-portal-button" href="<?php echo esc_url( $packers_agency_portal_url ); ?>">
					<?php echo esc_html( $packers_agency_portal_label ); ?>
				</a>
				<p class="joathiva-portal-note"><?php esc_html_e( 'Ingreso controlado al asistente y al panel operativo.', 'packers-agency' ); ?></p>
			</div>
		</div>
	</div>
</section>

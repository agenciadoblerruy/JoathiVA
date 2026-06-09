<?php
/**
 * Front page content for JoathiLogística.
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

$packers_agency_sections = array(
	array(
		'title'       => __( 'Operativa diaria', 'packers-agency' ),
		'description' => __( 'Centralizá el seguimiento comercial, las tareas y el control operativo de cada cliente en una sola vista.', 'packers-agency' ),
	),
	array(
		'title'       => __( 'Documentación', 'packers-agency' ),
		'description' => __( 'Ordená DUA, CRT, MIC, facturas y comprobantes para que cada caso quede trazable y listo para revisar.', 'packers-agency' ),
	),
	array(
		'title'       => __( 'Cotizaciones', 'packers-agency' ),
		'description' => __( 'Presentá tarifas, seguimientos y oportunidades con una navegación clara y orientada a conversión.', 'packers-agency' ),
	),
	array(
		'title'       => __( 'Acceso a JoathiVA', 'packers-agency' ),
		'description' => __( 'Ingresá al tablero operativo y al asistente con acceso controlado para CRM, agenda y operaciones.', 'packers-agency' ),
	),
);

$packers_agency_flow = array(
	array(
		'step'  => '01',
		'title' => __( 'Ingreso', 'packers-agency' ),
		'text'  => __( 'El correo o la solicitud entra al flujo y se asocia al cliente correcto.', 'packers-agency' ),
	),
	array(
		'step'  => '02',
		'title' => __( 'Clasificación', 'packers-agency' ),
		'text'  => __( 'Se define si corresponde tarea, actividad, operación o solo seguimiento.', 'packers-agency' ),
	),
	array(
		'step'  => '03',
		'title' => __( 'Ejecución', 'packers-agency' ),
		'text'  => __( 'Se actualiza el expediente, se genera draft y se deja trazabilidad para revisión humana.', 'packers-agency' ),
	),
	array(
		'step'  => '04',
		'title' => __( 'Cierre', 'packers-agency' ),
		'text'  => __( 'La operación queda documentada, reconciliada y lista para continuar o archivar.', 'packers-agency' ),
	),
);
?>

<section class="joathi-hero">
	<div class="container">
		<div class="row align-items-center g-4">
			<div class="col-lg-7">
				<span class="joathi-eyebrow"><?php esc_html_e( 'JoathiLogística · Operativa y seguimiento', 'packers-agency' ); ?></span>
				<h1><?php esc_html_e( 'Soluciones logísticas integrales para su empresa.', 'packers-agency' ); ?></h1>
				<p class="joathi-hero-text">
					<?php esc_html_e( 'Transporte, Aduanas y Distribución con la mejor tecnología.', 'packers-agency' ); ?>
				</p>
				<div class="joathi-hero-actions">
					<a class="joathi-btn joathi-btn-primary" href="#contacto">
						<?php esc_html_e( 'Solicitar Cotización', 'packers-agency' ); ?>
					</a>
					<a class="joathi-btn joathi-btn-secondary" href="#servicios">
						<?php esc_html_e( 'Conocé Más', 'packers-agency' ); ?>
					</a>
				</div>
				<div class="joathi-stat-row" aria-hidden="true">
					<span><?php esc_html_e( 'CRM', 'packers-agency' ); ?></span>
					<span><?php esc_html_e( 'Agenda', 'packers-agency' ); ?></span>
					<span><?php esc_html_e( 'Operaciones', 'packers-agency' ); ?></span>
					<span><?php esc_html_e( 'Documentación', 'packers-agency' ); ?></span>
				</div>
			</div>
			<div class="col-lg-5">
				<div class="joathi-hero-panel">
					<div class="joathi-hero-panel-top">
						<span><?php esc_html_e( 'Panel operativo', 'packers-agency' ); ?></span>
						<strong><?php esc_html_e( 'JoathiVA', 'packers-agency' ); ?></strong>
					</div>
					<div class="joathi-hero-metrics">
						<div>
							<strong><?php esc_html_e( 'CRM', 'packers-agency' ); ?></strong>
							<span><?php esc_html_e( 'Clientes y seguimiento', 'packers-agency' ); ?></span>
						</div>
						<div>
							<strong><?php esc_html_e( 'Agenda', 'packers-agency' ); ?></strong>
							<span><?php esc_html_e( 'Tareas y prioridades', 'packers-agency' ); ?></span>
						</div>
						<div>
							<strong><?php esc_html_e( 'Operaciones', 'packers-agency' ); ?></strong>
							<span><?php esc_html_e( 'Checklist y estado', 'packers-agency' ); ?></span>
						</div>
						<div>
							<strong><?php esc_html_e( 'Contacto', 'packers-agency' ); ?></strong>
							<span><?php esc_html_e( 'Acceso y soporte', 'packers-agency' ); ?></span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="joathi-section" id="servicios">
	<div class="container">
		<div class="joathi-section-heading">
			<span><?php esc_html_e( 'Servicios', 'packers-agency' ); ?></span>
			<h2><?php esc_html_e( 'Un sitio claro para presentar la operación y facilitar el ingreso al trabajo diario.', 'packers-agency' ); ?></h2>
		</div>
		<div class="row g-4">
			<?php foreach ( $packers_agency_sections as $packers_agency_section ) : ?>
				<div class="col-md-6 col-lg-3">
					<article class="joathi-info-card">
						<h3><?php echo esc_html( $packers_agency_section['title'] ); ?></h3>
						<p><?php echo esc_html( $packers_agency_section['description'] ); ?></p>
					</article>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="joathi-section joathi-section-alt" id="operativa">
	<div class="container">
		<div class="joathi-section-heading">
			<span><?php esc_html_e( 'Cómo trabajamos', 'packers-agency' ); ?></span>
			<h2><?php esc_html_e( 'Un flujo pensado para que nada operativo quede sin seguimiento.', 'packers-agency' ); ?></h2>
		</div>
		<div class="row g-4">
			<?php foreach ( $packers_agency_flow as $packers_agency_item ) : ?>
				<div class="col-md-6 col-xl-3">
					<article class="joathi-flow-card">
						<div class="joathi-flow-step"><?php echo esc_html( $packers_agency_item['step'] ); ?></div>
						<h3><?php echo esc_html( $packers_agency_item['title'] ); ?></h3>
						<p><?php echo esc_html( $packers_agency_item['text'] ); ?></p>
					</article>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<?php get_template_part( 'sections/section-joathiva-portal' ); ?>

<section class="joathi-section" id="contacto">
	<div class="container">
		<div class="joathi-contact-band">
			<div class="joathi-contact-copy">
				<span><?php esc_html_e( 'Contacto', 'packers-agency' ); ?></span>
				<h2><?php esc_html_e( 'Dejá listo el canal institucional para clientes, proveedores y seguimiento interno.', 'packers-agency' ); ?></h2>
				<p><?php esc_html_e( 'El sitio queda preparado para mostrar la operación, conectar con JoathiVA y recibir el siguiente paso comercial o documental.', 'packers-agency' ); ?></p>
			</div>
			<div class="joathi-contact-actions">
				<a class="joathi-btn joathi-btn-primary" href="<?php echo esc_url( $packers_agency_portal_url ); ?>">
					<?php echo esc_html( $packers_agency_portal_label ); ?>
				</a>
				<a class="joathi-btn joathi-btn-secondary" href="#contacto">
					<?php esc_html_e( 'Ir a contacto', 'packers-agency' ); ?>
				</a>
			</div>
		</div>
	</div>
</section>

<?php if ( have_posts() ) : ?>
	<section class="joathi-section joathi-section-content">
		<div class="container">
			<?php while ( have_posts() ) : the_post(); ?>
				<article id="post-<?php the_ID(); ?>" <?php post_class( 'joathi-home-content' ); ?>>
					<?php the_content(); ?>
				</article>
			<?php endwhile; ?>
		</div>
	</section>
<?php endif; ?>

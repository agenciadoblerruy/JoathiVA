<?php
/**
 * Generic corporate page renderer.
 *
 * @package packers_agency
 */

$packers_agency_config = get_query_var( 'packers_agency_corporate_page', array() );

$packers_agency_defaults = array(
	'eyebrow' => '',
	'title'   => '',
	'intro'   => '',
	'buttons' => array(),
	'cards'   => array(),
	'steps'   => array(),
	'points'  => array(),
	'cta'     => array(),
);

$packers_agency_config = wp_parse_args( is_array( $packers_agency_config ) ? $packers_agency_config : array(), $packers_agency_defaults );
?>

<section class="joathi-page-hero">
	<div class="container">
		<div class="joathi-page-shell">
			<span class="joathi-eyebrow"><?php echo esc_html( $packers_agency_config['eyebrow'] ); ?></span>
			<h1 class="joathi-page-title"><?php echo esc_html( $packers_agency_config['title'] ); ?></h1>
			<?php if ( ! empty( $packers_agency_config['intro'] ) ) : ?>
				<p class="joathi-page-intro"><?php echo esc_html( $packers_agency_config['intro'] ); ?></p>
			<?php endif; ?>
			<?php if ( ! empty( $packers_agency_config['buttons'] ) ) : ?>
				<div class="joathi-hero-actions">
					<?php foreach ( $packers_agency_config['buttons'] as $packers_agency_button ) : ?>
						<a class="joathi-btn <?php echo esc_attr( $packers_agency_button['class'] ?? 'joathi-btn-secondary' ); ?>" href="<?php echo esc_url( $packers_agency_button['url'] ?? '#' ); ?>">
							<?php echo esc_html( $packers_agency_button['label'] ?? '' ); ?>
						</a>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>

<?php if ( ! empty( $packers_agency_config['cards'] ) ) : ?>
	<section class="joathi-section">
		<div class="container">
			<div class="row g-4">
				<?php foreach ( $packers_agency_config['cards'] as $packers_agency_card ) : ?>
					<div class="col-md-6 col-lg-4">
						<article class="joathi-info-card">
							<?php if ( ! empty( $packers_agency_card['eyebrow'] ) ) : ?>
								<span class="joathi-card-eyebrow"><?php echo esc_html( $packers_agency_card['eyebrow'] ); ?></span>
							<?php endif; ?>
							<h3><?php echo esc_html( $packers_agency_card['title'] ?? '' ); ?></h3>
							<p><?php echo esc_html( $packers_agency_card['text'] ?? '' ); ?></p>
						</article>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
<?php endif; ?>

<?php if ( ! empty( $packers_agency_config['steps'] ) ) : ?>
	<section class="joathi-section joathi-section-alt">
		<div class="container">
			<div class="row g-4">
				<?php foreach ( $packers_agency_config['steps'] as $packers_agency_step ) : ?>
					<div class="col-md-6 col-xl-3">
						<article class="joathi-flow-card">
							<div class="joathi-flow-step"><?php echo esc_html( $packers_agency_step['step'] ?? '' ); ?></div>
							<h3><?php echo esc_html( $packers_agency_step['title'] ?? '' ); ?></h3>
							<p><?php echo esc_html( $packers_agency_step['text'] ?? '' ); ?></p>
						</article>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
<?php endif; ?>

<?php if ( ! empty( $packers_agency_config['points'] ) ) : ?>
	<section class="joathi-section">
		<div class="container">
			<div class="joathi-callout">
				<div>
					<span class="joathi-eyebrow"><?php echo esc_html( $packers_agency_config['points']['eyebrow'] ?? '' ); ?></span>
					<h2><?php echo esc_html( $packers_agency_config['points']['title'] ?? '' ); ?></h2>
				</div>
				<ul class="joathi-bullet-list">
					<?php foreach ( $packers_agency_config['points']['items'] ?? array() as $packers_agency_item ) : ?>
						<li><?php echo esc_html( $packers_agency_item ); ?></li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
	</section>
<?php endif; ?>

<?php if ( ! empty( $packers_agency_config['cta'] ) ) : ?>
	<section class="joathi-section">
		<div class="container">
			<div class="joathi-contact-band">
				<div class="joathi-contact-copy">
					<span><?php echo esc_html( $packers_agency_config['cta']['eyebrow'] ?? '' ); ?></span>
					<h2><?php echo esc_html( $packers_agency_config['cta']['title'] ?? '' ); ?></h2>
					<p><?php echo esc_html( $packers_agency_config['cta']['text'] ?? '' ); ?></p>
				</div>
				<div class="joathi-contact-actions">
					<?php foreach ( $packers_agency_config['cta']['buttons'] ?? array() as $packers_agency_button ) : ?>
						<a class="joathi-btn <?php echo esc_attr( $packers_agency_button['class'] ?? 'joathi-btn-secondary' ); ?>" href="<?php echo esc_url( $packers_agency_button['url'] ?? '#' ); ?>">
							<?php echo esc_html( $packers_agency_button['label'] ?? '' ); ?>
						</a>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	</section>
<?php endif; ?>

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
